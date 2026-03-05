import { redirect } from "next/navigation";

export default function TutorRedirect({ params }) {
  redirect(`/student/courses/${params.courseId}/tutor`);
}