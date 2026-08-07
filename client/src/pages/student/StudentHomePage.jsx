import { useOutletContext } from "react-router-dom";
import { DashboardHome } from "../../components/Portal/views/StudentHomeView";

export default function StudentHomePage() {
    const { onPasswordChanged, student } = useOutletContext();

    return <DashboardHome onPasswordChanged={onPasswordChanged} student={student} />;
}
