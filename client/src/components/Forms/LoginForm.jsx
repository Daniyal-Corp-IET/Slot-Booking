import { useState } from "react";
import { LoginView } from "./LoginForm.helpers";

export default function LoginForm({ onLogin }) {
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordHelp, setShowPasswordHelp] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
        setError("");
    };

    const handleForgotPassword = () => {
        setShowPasswordHelp((visible) => !visible);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setIsSubmitting(true);
            setError("");
            await onLogin(formData.username.trim(), formData.password);
        } catch (loginError) {
            setError(loginError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <LoginView
            error={error}
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onForgotPassword={handleForgotPassword}
            onSubmit={handleSubmit}
            onTogglePassword={() => setShowPassword((visible) => !visible)}
            passwordHelpVisible={showPasswordHelp}
            showPassword={showPassword}
        />
    );
}
