import { useAccountStore } from "@/stores/accountStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Account } from "@/types";

export function useAccounts() {
  const supabase = createClientComponentClient();
  const {
    accounts,
    loading,
    setAccounts,
    setLoading,
    addAccount: addToStore,
    removeAccount: removeFromStore,
  } = useAccountStore();

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .is("is_archived", false)
      .order("created_at");
    if (data) setAccounts(data);
    setLoading(false);
  };

  const addAccount = async (
    accountData: Omit<Account, "id" | "created_at" | "is_archived">
  ) => {
    const { data, error } = await supabase
      .from("accounts")
      .insert([{ ...accountData, is_archived: false }])
      .select()
      .single();

    if (error) throw error;
    if (data) {
      addToStore(data);
    }
    return data;
  };

  const updateAccountEntry = async (
    accountId: string,
    accountData: Partial<Omit<Account, "id" | "created_at" | "is_archived">>
  ) => {
    const { data, error } = await supabase
      .from("accounts")
      .update(accountData)
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      // Update store
      setAccounts(
        accounts.map((acc) => (acc.id === accountId ? data : acc))
      );
    }
    return data;
  };

  const deleteAccount = async (accountId: string) => {
    const { error } = await supabase
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", accountId);

    if (error) throw error;
    removeFromStore(accountId);
  };

  return {
    accounts,
    loading,
    fetchAccounts,
    addAccount,
    updateAccountEntry,
    deleteAccount,
  };
}