package global.medicea.app;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Validates a manually supplied, revocable Vercel sharing link for this preview only. */
public final class PreviewAccessLink {
    public static final String ORIGIN = "https://medicea-core-git-feature-google-17fe5b-medmatchglobals-projects.vercel.app";
    private PreviewAccessLink() {}

    public static String validated(String input) {
        try {
            if (input == null || input.length() > 4096) return null;
            URI uri = new URI(input.trim());
            URI origin = new URI(ORIGIN);
            if (!"https".equals(uri.getScheme()) || !origin.getHost().equals(uri.getHost()) ||
                uri.getPort() != -1 || uri.getRawUserInfo() != null || uri.getRawFragment() != null ||
                !("/".equals(uri.getRawPath()) || "".equals(uri.getRawPath()))) return null;
            String query = uri.getRawQuery();
            if (query == null || !query.startsWith("_vercel_share=") || query.contains("&")) return null;
            String token = URLDecoder.decode(query.substring("_vercel_share=".length()), StandardCharsets.UTF_8.name());
            if (token.isEmpty() || token.length() > 2048 || token.chars().anyMatch(c -> c <= 32 || c == 127)) return null;
            return ORIGIN + "/?_vercel_share=" + URLEncoder.encode(token, StandardCharsets.UTF_8.name());
        } catch (Exception ignored) { return null; }
    }
}
