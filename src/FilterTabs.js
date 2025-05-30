import React from "react";

export default function FilterTabs({ filterStatus, setFilterStatus }) {
  return (
    <div className="flex space-x-2 mb-2">
      <button className={filterStatus === "未クリア" ? "underline" : ""} onClick={() => setFilterStatus("未クリア")}>未完了</button>
      <button className={filterStatus === "クリア" ? "underline" : ""} onClick={() => setFilterStatus("クリア")}>完了</button>
    </div>
  );
}