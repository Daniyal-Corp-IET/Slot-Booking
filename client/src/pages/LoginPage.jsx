import { Navigate, useNavigate } from "react-router-dom";
import { LoginCardSkeleton } from "../components/Feedback/LoginCardSkeleton";
import LoginForm from "../components/Forms/LoginForm";
import { useLogin } from "../context/LoginContext";

export default function LoginPage() {
    const navigate = useNavigate();
    const { loading, login, user } = useLogin();

    const handleLogin = async (username, password) => {
        const loggedInUser = await login(username, password);
        const portalPath = loggedInUser.role === "admin" ? "/admin" : "/portal";
        navigate(portalPath);
    };

    if (loading) return <LoginCardSkeleton />;
    if (user) {
        return <Navigate replace to={user.role === "admin" ? "/admin" : "/portal"} />;
    }

    return <LoginForm onLogin={handleLogin} />;
}
