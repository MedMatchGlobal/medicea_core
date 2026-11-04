package global.medicea.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class PreviewAccessLinkTest {
    private final String root = PreviewAccessLink.ORIGIN;
    @Test public void acceptsOnlyThisPreviewAndNormalizesTheToken() {
        assertEquals(root + "/?_vercel_share=fixture-only", PreviewAccessLink.validated(root + "?_vercel_share=fixture-only"));
        assertEquals(root + "/?_vercel_share=fixture%2Bonly", PreviewAccessLink.validated(root + "/?_vercel_share=fixture%2Bonly"));
    }
    @Test public void rejectsOtherDestinationsAndCredentialForms() {
        for (String value : new String[]{null, "", root, root+"/?_vercel_share=", root+"/?_vercel_share=%0Asecret",
            root+"/?_vercel_share=x&redirect=https://example.com", root+"/?x-vercel-protection-bypass=fixture",
            root+"/membership?_vercel_share=fixture", root+"/?_vercel_share=fixture#fragment",
            root.replace("https:", "http:")+"/?_vercel_share=fixture",
            root+":443/?_vercel_share=fixture", root.replace("https://", "https://user@")+"/?_vercel_share=fixture",
            root+".evil.example/?_vercel_share=fixture", "javascript:alert(1)"}) {
            assertNull(PreviewAccessLink.validated(value));
        }
    }
}
