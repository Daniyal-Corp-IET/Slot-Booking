import { useOutletContext } from "react-router-dom";
import { SystemsView } from "../../components/Admin/views/AdminSystemsView";

export default function AdminSystemsPage() {
    const { releasedSystemId } = useOutletContext();

    return <SystemsView key={releasedSystemId ?? 0} />;
}
