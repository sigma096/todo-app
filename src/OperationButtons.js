import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function OperationButtons({
  setShowModal, setNewTask, tab,
  tasks, deletedTasks, fileInputRef,
  XLSX_STORAGE_KEY, setTasks, setDeletedTasks
}) {
  return (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setNewTask((prev) => ({ ...prev, 分類: tab }));
          setShowModal(true);
        }}
        className="px-2 py-1 bg-green-500 text-white rounded"
      >＋追加</button>
      <button
        className="px-2 py-1 bg-blue-500 text-white rounded"
        onClick={() => {
          const wb = XLSX.utils.book_new();
          const ws1 = XLSX.utils.json_to_sheet(tasks);
          const ws2 = XLSX.utils.json_to_sheet(deletedTasks);
          XLSX.utils.book_append_sheet(wb, ws1, "タスク");
          XLSX.utils.book_append_sheet(wb, ws2, "削除済み");
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const b64 = btoa(String.fromCharCode(...new Uint8Array(wbout)));
          localStorage.setItem(XLSX_STORAGE_KEY, b64);
          alert("データをローカルストレージに保存しました。");
        }}
      >保存</button>
      <button
        className="px-2 py-1 bg-green-500 text-white rounded"
        onClick={() => {
          const base64 = localStorage.getItem(XLSX_STORAGE_KEY);
          if (!base64) {
            alert("保存データがありません。");
            return;
          }
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          saveAs(new Blob([bytes], { type: "application/octet-stream" }), "todo-app-data.xlsx");
        }}
      >ダウンロード</button>
      <button
        className="px-2 py-1 bg-yellow-500 text-white rounded"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >読込</button>
      <input
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = evt => {
            try {
              const data = new Uint8Array(evt.target.result);
              const wb = XLSX.read(data, { type: "array" });
              const ws1 = wb.Sheets["タスク"];
              const ws2 = wb.Sheets["削除済み"];
              const loadedTasks = ws1 ? XLSX.utils.sheet_to_json(ws1) : [];
              const loadedDeleted = ws2 ? XLSX.utils.sheet_to_json(ws2) : [];
              setTasks(Array.isArray(loadedTasks) ? loadedTasks : []);
              setDeletedTasks(Array.isArray(loadedDeleted) ? loadedDeleted : []);
            } catch {
              alert("ファイルの読み込みに失敗しました。");
            }
          };
          reader.readAsArrayBuffer(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}