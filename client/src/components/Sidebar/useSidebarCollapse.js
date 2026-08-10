import { useEffect, useState } from "react";

const STORAGE_KEY = "itx-sidebar-collapsed";

function readStoredValue() {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
}

// Persists the desktop sidebar's collapsed state across navigation and reloads, shared by both portals.
export function useSidebarCollapse() {
    const [collapsed, setCollapsed] = useState(readStoredValue);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    function toggleCollapsed() {
        setCollapsed((current) => !current);
    }

    return [collapsed, toggleCollapsed];
}
