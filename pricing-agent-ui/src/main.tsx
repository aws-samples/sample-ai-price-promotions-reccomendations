import { Authenticator } from "@aws-amplify/ui-react";
import React from "react";
import ReactDOM from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import "@cloudscape-design/global-styles/index.css";
import "react-toastify/dist/ReactToastify.css";
import "@xyflow/react/dist/style.css";
import "./i18n";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Authenticator.Provider>
            <App />
        </Authenticator.Provider>
    </React.StrictMode>
);
