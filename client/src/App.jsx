import AppRoutes from "./routes/AppRoutes";
import { LabProvider } from "./context/LabContext";
import { LoginProvider } from "./context/LoginContext";

export default function App() {
    return (
        <LoginProvider>
            <LabProvider>
                <AppRoutes />
            </LabProvider>
        </LoginProvider>
    );
}
