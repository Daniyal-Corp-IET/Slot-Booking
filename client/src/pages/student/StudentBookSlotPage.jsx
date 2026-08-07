import { useOutletContext } from "react-router-dom";
import { BookSlotView } from "../../components/Portal/views/StudentBookingView";

export default function StudentBookSlotPage() {
    const { student } = useOutletContext();

    return <BookSlotView student={student} />;
}
