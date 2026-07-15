import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase, type Box } from "../supabase";
import { cache } from "../database";
import { enqueue } from "../sync-queue";

interface BinProps {
  selectedGroupId: string;
  onBack: () => void;
}

export const Bin: React.FC<BinProps> = ({ selectedGroupId, onBack }) => {
  const { t } = useTranslation();
  const [boxes, setBoxes] = useState<Box[]>([]);

  const load = () => {
    cache.boxes
      .filter((b) => {
        if (!b.deleted_at) return false;
        if (selectedGroupId && b.group_id !== selectedGroupId) return false;
        return true;
      })
      .toArray()
      .then((list) => {
        list.sort(
          (a, b) =>
            new Date(b.deleted_at!).getTime() -
            new Date(a.deleted_at!).getTime(),
        );
        setBoxes(list);
      });
  };

  useEffect(() => {
    load();
  }, [selectedGroupId]);

  const handleRestore = async (id: string) => {
    await cache.boxes.update(id, { deleted_at: null });
    const { error: err } = await supabase
      .from("boxes")
      .update({ deleted_at: null })
      .eq("id", id);
    if (err) console.warn("Supabase restore failed, updated locally:", err.message);
    await enqueue("restore", id);
    load();
  };

  const handleHardDelete = async (id: string) => {
    await cache.boxes.delete(id);
    const { error: err } = await supabase.from("boxes").delete().eq("id", id);
    if (err) console.warn("Supabase delete failed, removed locally:", err.message);
    await enqueue("hardDelete", id);
    load();
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("nav.back_to_home")}
      </button>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        {t("bin.title")}
      </h2>
      <p className="text-sm text-gray-500 mb-6">{t("bin.description")}</p>

      {boxes.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-8 text-center">
          {t("bin.empty")}
        </p>
      ) : (
        <div className="space-y-3 max-w-lg">
          {boxes.map((box) => (
            <div
              key={box.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-gray-900 truncate">
                    {box.id}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {box.side} &middot; {t("bin.level")} {box.level}
                  </p>
                  {box.deleted_at && (
                    <p className="text-xs text-red-400 mt-0.5">
                      {t("bin.deleted")}{" "}
                      {new Date(box.deleted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(box.id)}
                    className="px-4 py-2 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
                  >
                    {t("bin.restore")}
                  </button>
                  <button
                    onClick={() => handleHardDelete(box.id)}
                    className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    {t("bin.delete_forever")}
                  </button>
                </div>
              </div>
              {box.items && box.items.length > 0 && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {box.items.slice(0, 3).join(", ")}
                  {box.items.length > 3 && "..."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
