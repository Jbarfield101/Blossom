import { FaQuestionCircle } from "react-icons/fa";

export default function HelpIcon({ text }: { text: string }) {
  return (
    <FaQuestionCircle
      title={text}
      style={{ marginLeft: 4, cursor: "help", opacity: 0.6 }}
    />
  );
}
