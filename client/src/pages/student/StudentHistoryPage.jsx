import { useOutletContext } from "react-router-dom";
import { HistoryView } from "../../components/Portal/views/StudentHistoryView";

export default function StudentHistoryPage() {
    const { student } = useOutletContext();

    return <HistoryView student={student} />;
}
