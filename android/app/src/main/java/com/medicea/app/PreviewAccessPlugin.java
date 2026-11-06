package global.medicea.app;

import android.app.AlertDialog;
import android.net.Uri;
import android.os.Build;
import android.text.InputType;
import android.view.View;
import android.view.WindowManager;
import android.widget.EditText;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Native setup only: never exposes an unlock method to JavaScript. */
@CapacitorPlugin(name="PreviewAccess")
public class PreviewAccessPlugin extends Plugin {
    private boolean showing;
    private boolean attempted;

    @Override public Boolean shouldOverrideLoad(Uri uri) {
        if (!PreviewAccessLink.ORIGIN.equals(bridge.getConfig().getServerUrl())) return null;
        String path = uri.getPath();
        if (!"https".equals(uri.getScheme()) || !"vercel.com".equals(uri.getHost()) ||
            !("/login".equals(path) || "/sso-api".equals(path))) return null;
        // Keep authentication inside this WebView; Chrome's cookies cannot unlock it.
        getActivity().runOnUiThread(this::unlock);
        return true;
    }

    private void unlock() {
        if (showing || getActivity().isFinishing()) return;
        showing = true;
        EditText input = new EditText(getContext());
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        input.setSaveEnabled(false);
        if (Build.VERSION.SDK_INT >= 26) input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        input.setHint("Paste your private test link");
        int pad = (int)(20 * getContext().getResources().getDisplayMetrics().density);
        input.setPadding(pad, pad, pad, pad);
        AlertDialog dialog = new AlertDialog.Builder(getContext())
            .setTitle("Open the private Medicea test")
            .setMessage(attempted
                ? "Access was not accepted. Paste a current private sharing link for this test preview."
                : "Paste the private sharing link supplied for this test. You will sign in to Medicea afterwards.")
            .setView(input)
            .setPositiveButton("Open test preview", null)
            .setNegativeButton("Close", (d, which) -> getActivity().finish())
            .setCancelable(false)
            .create();
        dialog.setOnDismissListener(d -> { input.setText(""); showing = false; });
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String url = PreviewAccessLink.validated(input.getText().toString());
            if (url == null) { input.setError("Use the private sharing link for this Medicea test preview."); return; }
            attempted = true;
            dialog.dismiss();
            // The link is not stored in preferences, packaged config or application logs.
            // Vercel validates it and sets its own access cookie in this WebView.
            bridge.getWebView().loadUrl(url);
        }));
        dialog.show();
        if (dialog.getWindow() != null) dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
