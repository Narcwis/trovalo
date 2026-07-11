import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase, type Group, type GroupMember } from "../supabase";

export const AdminConsole: React.FC = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadMembers(selectedGroupId);
    } else {
      setMembers([]);
    }
  }, [selectedGroupId]);

  async function loadGroups() {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .order("name");
    if (data) setGroups(data as Group[]);
  }

  async function loadMembers(groupId: string) {
    const { data } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("email");
    if (data) setMembers(data as GroupMember[]);
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    await supabase.from("groups").insert({ name });
    setNewGroupName("");
    loadGroups();
  }

  async function handleDeleteGroup(id: string) {
    await supabase.from("groups").delete().eq("id", id);
    if (selectedGroupId === id) setSelectedGroupId(null);
    loadGroups();
  }

  async function handleAddMember() {
    const email = newMemberEmail.trim().toLowerCase();
    if (!email || !selectedGroupId) return;
    await supabase.from("group_members").insert({
      group_id: selectedGroupId,
      email,
      role: "member",
    });
    setNewMemberEmail("");
    loadMembers(selectedGroupId);
  }

  async function handleRemoveMember(id: string) {
    await supabase.from("group_members").delete().eq("id", id);
    if (selectedGroupId) loadMembers(selectedGroupId);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("admin.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t("admin.description")}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t("admin.create_group")}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            placeholder={t("admin.group_name_placeholder")}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("admin.create")}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div
              onClick={() =>
                setSelectedGroupId(
                  selectedGroupId === group.id ? null : group.id,
                )
              }
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900">{group.name}</span>
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    selectedGroupId === group.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title={t("admin.delete_group")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {selectedGroupId === group.id && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    {t("admin.no_members")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-gray-700">
                          {m.email}
                          {m.role === "admin" && (
                            <span className="ml-2 text-xs text-indigo-500 font-medium">
                              ({t("admin.admin_role")})
                            </span>
                          )}
                        </span>
                        {m.role !== "admin" && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            {t("admin.remove")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddMember()
                    }
                    placeholder={t("admin.add_member_placeholder")}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={!newMemberEmail.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("admin.add")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            {t("admin.no_groups")}
          </p>
        )}
      </div>
    </div>
  );
};
