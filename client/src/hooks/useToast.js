import { useCallback, useState } from "react";

// Removes the repeated useState("") + clear boilerplate around <Toast>. Callers still render
// <Toast> explicitly: {toastMessage && <Toast message={toastMessage} onClose={dismissToast} />}
export function useToast() {
    const [message, setMessage] = useState("");
    const showToast = useCallback((text) => setMessage(text), []);
    const dismissToast = useCallback(() => setMessage(""), []);

    return { toastMessage: message, showToast, dismissToast };
}
