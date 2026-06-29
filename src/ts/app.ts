// Import CSS
import "@css/app.css";

// Pin a stable viewport-height CSS var (avoids iOS chrome-collapse rescale).
import "./lib/stable-viewport";

// Highlight <pre><code> blocks in rich text content
import "./lib/highlight";

// Import Lit components
import.meta.glob("./components/**/*.ts", { eager: true });
