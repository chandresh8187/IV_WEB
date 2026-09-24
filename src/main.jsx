import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import "./index.css";
import "@fontsource-variable/inter/wght.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RouteErrorBoundary>
        <App />
      </RouteErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
