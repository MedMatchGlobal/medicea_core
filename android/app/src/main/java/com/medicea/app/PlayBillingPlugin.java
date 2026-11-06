package global.medicea.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;

@CapacitorPlugin(name="PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall purchaseCall;
    private final Map<String,ProductDetails> details = new HashMap<>();
    private final Set<String> allowed = new HashSet<>(Arrays.asList("medicea_pass_7","medicea_pass_14","medicea_pass_30","medicea_personal"));
    @Override public void load() {
        client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void ready(PluginCall call,Runnable work) {
        getActivity().runOnUiThread(() -> {
            if(client.isReady()){work.run();return;}
            client.startConnection(new BillingClientStateListener(){
                public void onBillingSetupFinished(BillingResult r){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)work.run();else call.reject("Google Play connection unavailable");}
                public void onBillingServiceDisconnected(){}
            });
        });
    }
    private JSObject purchases(List<Purchase> values){
        JSArray list=new JSArray();
        for(Purchase p:values){JSObject item=new JSObject();item.put("token",p.getPurchaseToken());item.put("products",new JSArray(p.getProducts()));item.put("state",p.getPurchaseState());list.put(item);}
        JSObject result=new JSObject();result.put("purchases",list);return result;
    }
    @PluginMethod public void products(PluginCall call){ready(call,()->{
        try {
            JSArray input=call.getArray("items");if(input==null||input.length()>10){call.reject("Invalid catalogue");return;}
            List<QueryProductDetailsParams.Product> list=new ArrayList<>();Set<String> seen=new HashSet<>();
            for(int i=0;i<input.length();i++){
                String id=input.getJSONObject(i).getString("product"),type=input.getJSONObject(i).getString("type");
                if(!allowed.contains(id)||!(id.equals("medicea_personal")?type.equals("subs"):type.equals("inapp"))){call.reject("Invalid product");return;}
                if(seen.add(id))list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build());
            }
            client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(r,result)->{
                if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Products unavailable");return;}
                JSArray offers=new JSArray();
                for(ProductDetails p:result.getProductDetailsList()){
                    details.put(p.getProductId(),p);
                    if(p.getProductType().equals("subs")){
                        List<ProductDetails.SubscriptionOfferDetails> items=p.getSubscriptionOfferDetails();if(items==null)continue;
                        for(ProductDetails.SubscriptionOfferDetails o:items){
                            // Only standard base plans: no introductory or trial pricing.
                            if(o.getOfferId()!=null)continue;
                            List<ProductDetails.PricingPhase> phases=o.getPricingPhases().getPricingPhaseList();if(phases.size()!=1)continue;
                            JSObject row=offer(p,o.getOfferToken(),phases.get(0).getFormattedPrice());row.put("basePlan",o.getBasePlanId());offers.put(row);
                        }
                    } else {
                        List<ProductDetails.OneTimePurchaseOfferDetails> items=p.getOneTimePurchaseOfferDetailsList();if(items==null)continue;
                        for(ProductDetails.OneTimePurchaseOfferDetails o:items){
                            if(o.getOfferId()!=null||o.getPreorderDetails()!=null||o.getRentalDetails()!=null)continue;
                            offers.put(offer(p,o.getOfferToken(),o.getFormattedPrice()));
                        }
                    }
                }
                JSObject response=new JSObject();response.put("offers",offers);call.resolve(response);
            });
        }catch(Exception e){call.reject("Invalid products request");}
    });}
    private JSObject offer(ProductDetails p,String token,String price){JSObject row=new JSObject();row.put("product",p.getProductId());row.put("type",p.getProductType());row.put("offerToken",token);row.put("price",price);return row;}
    @PluginMethod public void purchase(PluginCall call){ready(call,()->{
        if(purchaseCall!=null){call.reject("Purchase already in progress");return;}
        String id=call.getString("product"),account=call.getString("account"),token=call.getString("offerToken");
        ProductDetails p=details.get(id);
        if(p==null||account==null||!account.matches("[a-f0-9]{64}")||token==null){call.reject("Reload products and sign in");return;}
        BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(p).setOfferToken(token).build();
        purchaseCall=call;
        BillingResult r=client.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setObfuscatedAccountId(account).setProductDetailsParamsList(Collections.singletonList(item)).build());
        if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK){purchaseCall=null;call.reject("Purchase could not start");}
    });}
    @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> values){
        if(purchaseCall!=null){PluginCall call=purchaseCall;purchaseCall=null;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&values!=null)call.resolve(purchases(values));else call.reject("Purchase cancelled or unavailable");
        }
        // Out-of-app and completed pending purchases are recovered by restore on resume.
    }
    @PluginMethod public void restore(PluginCall call){ready(call,()->{
        List<Purchase> all=new ArrayList<>();
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType("inapp").build(),(r,items)->{
            if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Restore unavailable");return;}all.addAll(items);
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType("subs").build(),(s,subs)->{
                if(s.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Restore unavailable");return;}all.addAll(subs);call.resolve(purchases(all));
            });
        });
    });}
    @Override protected void handleOnDestroy(){if(purchaseCall!=null){purchaseCall.reject("Activity closed; restore on return");purchaseCall=null;}if(client!=null)client.endConnection();}
}
