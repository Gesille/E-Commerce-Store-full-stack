import { useState } from "react";

export function NoteModal({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-gray-900">Order Note</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Allergies, special requests…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 outline-none focus:border-blue-400 resize-none h-24 placeholder-gray-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer">Cancel</button>
          <button onClick={() => { onSave(note); onClose(); }} className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}