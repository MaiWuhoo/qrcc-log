export default function StatusStamp({ state }) {
  // state: "draft" | "ready" | "submitted"
  const config = {
    draft: { text: "DRAFT", tone: "stamp-steel" },
    ready: { text: "READY TO SUBMIT", tone: "stamp-amber" },
    submitted: { text: "SUBMITTED", tone: "stamp-moss" },
  }[state];

  return (
    <div className={`stamp ${config.tone}`} aria-hidden="true">
      <span>{config.text}</span>
    </div>
  );
}
