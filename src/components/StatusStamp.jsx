export default function StatusStamp({ state }) {
  // state: "draf" | "sedia" | "dihantar"
  const config = {
    draf: { text: "DRAF", tone: "stamp-steel" },
    sedia: { text: "READY TO SUBMIT", tone: "stamp-amber" },
    dihantar: { text: "SUBMIT", tone: "stamp-moss" },
  }[state];

  return (
    <div className={`stamp ${config.tone}`} aria-hidden="true">
      <span>{config.text}</span>
    </div>
  );
}
