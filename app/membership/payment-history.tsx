'use client';
import ConfirmationHistory from './confirmation-history';
import {useRef,useState} from 'react';
import {useMembershipCopy} from '../i18n/membership';
import type {PaymentReceipt} from '@/lib/membership/receipts';
import styles from './membership.module.css';
const words:Record<string,string[]>={
 en:['Payments and receipts','No payments yet.','View receipt','Older payments','Refunded','Payment history is unavailable. Please try again.'],
 af:['Betalings en kwitansies','Nog geen betalings nie.','Bekyk kwitansie','Ouer betalings','Terugbetaal','Betalingsgeskiedenis is nie beskikbaar nie. Probeer weer.'],
 ar:['المدفوعات والإيصالات','لا توجد مدفوعات بعد.','عرض الإيصال','مدفوعات أقدم','تم رد المبلغ','سجل المدفوعات غير متاح. يرجى المحاولة مرة أخرى.'],
 cs:['Platby a účtenky','Zatím žádné platby.','Zobrazit účtenku','Starší platby','Vráceno','Historie plateb není dostupná. Zkuste to znovu.'],
 da:['Betalinger og kvitteringer','Ingen betalinger endnu.','Se kvittering','Ældre betalinger','Refunderet','Betalingshistorikken er utilgængelig. Prøv igen.'],
 de:['Zahlungen und Belege','Noch keine Zahlungen.','Beleg ansehen','Ältere Zahlungen','Erstattet','Der Zahlungsverlauf ist nicht verfügbar. Bitte erneut versuchen.'],
 el:['Πληρωμές και αποδείξεις','Δεν υπάρχουν ακόμη πληρωμές.','Προβολή απόδειξης','Παλαιότερες πληρωμές','Επιστροφή χρημάτων','Το ιστορικό πληρωμών δεν είναι διαθέσιμο. Δοκιμάστε ξανά.'],
 es:['Pagos y recibos','Todavía no hay pagos.','Ver recibo','Pagos anteriores','Reembolsado','El historial de pagos no está disponible. Inténtalo de nuevo.'],
 fi:['Maksut ja kuitit','Ei vielä maksuja.','Näytä kuitti','Vanhemmat maksut','Palautettu','Maksuhistoria ei ole saatavilla. Yritä uudelleen.'],
 fr:['Paiements et reçus','Aucun paiement pour le moment.','Voir le reçu','Paiements antérieurs','Remboursé','L’historique des paiements est indisponible. Réessayez.'],
 he:['תשלומים וקבלות','אין תשלומים עדיין.','הצגת קבלה','תשלומים קודמים','הוחזר','היסטוריית התשלומים אינה זמינה. נסו שוב.'],
 hi:['भुगतान और रसीदें','अभी कोई भुगतान नहीं है।','रसीद देखें','पुराने भुगतान','वापस की गई राशि','भुगतान इतिहास उपलब्ध नहीं है। फिर से कोशिश करें।'],
 hu:['Fizetések és bizonylatok','Még nincs fizetés.','Bizonylat megtekintése','Korábbi fizetések','Visszatérítve','A fizetési előzmények nem érhetők el. Próbálja újra.'],
 it:['Pagamenti e ricevute','Nessun pagamento ancora.','Visualizza ricevuta','Pagamenti precedenti','Rimborsato','La cronologia dei pagamenti non è disponibile. Riprova.'],
 ja:['支払いと領収書','支払いはまだありません。','領収書を表示','以前の支払い','返金済み','支払い履歴を取得できません。もう一度お試しください。'],
 ko:['결제 및 영수증','아직 결제 내역이 없습니다.','영수증 보기','이전 결제','환불됨','결제 내역을 불러올 수 없습니다. 다시 시도해 주세요.'],
 nl:['Betalingen en ontvangstbewijzen','Nog geen betalingen.','Ontvangstbewijs bekijken','Eerdere betalingen','Terugbetaald','De betalingsgeschiedenis is niet beschikbaar. Probeer het opnieuw.'],
 no:['Betalinger og kvitteringer','Ingen betalinger ennå.','Se kvittering','Eldre betalinger','Refundert','Betalingshistorikken er utilgjengelig. Prøv igjen.'],
 pl:['Płatności i potwierdzenia','Brak płatności.','Zobacz potwierdzenie','Starsze płatności','Zwrócono','Historia płatności jest niedostępna. Spróbuj ponownie.'],
 pt:['Pagamentos e recibos','Ainda não há pagamentos.','Ver recibo','Pagamentos anteriores','Reembolsado','O histórico de pagamentos está indisponível. Tente novamente.'],
 ro:['Plăți și chitanțe','Nu există încă plăți.','Vezi chitanța','Plăți anterioare','Rambursat','Istoricul plăților nu este disponibil. Încercați din nou.'],
 ru:['Платежи и квитанции','Платежей пока нет.','Открыть квитанцию','Предыдущие платежи','Возвращено','История платежей недоступна. Попробуйте ещё раз.'],
 sv:['Betalningar och kvitton','Inga betalningar ännu.','Visa kvitto','Äldre betalningar','Återbetalat','Betalningshistoriken är inte tillgänglig. Försök igen.'],
 tr:['Ödemeler ve makbuzlar','Henüz ödeme yok.','Makbuzu görüntüle','Önceki ödemeler','İade edildi','Ödeme geçmişi kullanılamıyor. Lütfen tekrar deneyin.'],
 zh:['付款和收据','暂无付款。','查看收据','更早的付款','已退款','无法加载付款记录，请重试。'],
};
export default function PaymentHistory(){
 const {lang,copy}=useMembershipCopy(),text=words[lang]||words.en;
 const [payments,setPayments]=useState<PaymentReceipt[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false),[next,setNext]=useState<string|null>(null);
 const pending=useRef(false);
 async function load(older=false){if(pending.current)return;pending.current=true;setBusy(true);setError(false);
  try{const response=await fetch('/api/membership/receipts'+(older&&next?'?after='+encodeURIComponent(next):''),{cache:'no-store'});if(!response.ok)throw Error();const result=await response.json();setPayments(previous=>older?[...previous,...result.payments.filter((p:PaymentReceipt)=>!previous.some(old=>old.id===p.id))]:result.payments);setNext(result.next);setLoaded(true);}catch{setError(true);}finally{pending.current=false;setBusy(false);}
 }
 const money=(amount:number,currency:string)=>new Intl.NumberFormat(lang,{style:'currency',currency}).format(amount/100);
 return <details className={styles.paymentHistory} onToggle={event=>{if(event.currentTarget.open&&!loaded&&!pending.current)void load();}}><summary>{text[0]} · Stripe</summary>
 {payments.map(payment=><div className={styles.paymentRow} key={payment.id}><div><time dateTime={new Date(payment.created*1000).toISOString()}>{new Intl.DateTimeFormat(lang,{dateStyle:'medium'}).format(payment.created*1000)}</time><p><bdi>{money(payment.amountMinor,payment.currency)}</bdi>{payment.refundedMinor>0&&<> · {text[4]}: <bdi>{money(payment.refundedMinor,payment.currency)}</bdi></>}</p></div>{payment.receiptUrl&&<a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">{text[2]} ↗</a>}</div>)}
 {loaded&&!payments.length&&!error&&<p>{text[1]}</p>}{busy&&<p role="status">{copy.working}</p>}{error&&<p role="alert">{text[5]} <button className={styles.secondary} onClick={()=>void load(payments.length>0)} disabled={busy}>{copy.tryAgain}</button></p>}{next&&!error&&<button className={styles.secondary} disabled={busy} onClick={()=>void load(true)}>{text[3]}</button>}
 {loaded&&<ConfirmationHistory/>}
 </details>;
}
