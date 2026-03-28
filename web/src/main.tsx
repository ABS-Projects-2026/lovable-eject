import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ViewModeProvider } from "./context/ViewModeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ViewModeProvider>
      <App />
    </ViewModeProvider>
  </React.StrictMode>
);
