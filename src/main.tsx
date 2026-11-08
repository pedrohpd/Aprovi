import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.style.setProperty(
  "--select-arrow-icon",
  `url("${import.meta.env.BASE_URL}assets/64f6e.svg")`,
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
