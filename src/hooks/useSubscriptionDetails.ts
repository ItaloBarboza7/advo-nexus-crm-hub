
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionDetails {
  plan: string;
  amount: number;
  cardBrand: string;
  cardLast4: string;
  cardExp: string;
  status: string;
  isLoading: boolean;
  error?: string;
  subscriptionId?: string;
}

export function useSubscriptionDetails() {
  const [details, setDetails] = useState<SubscriptionDetails>({
    plan: "",
    amount: 0,
    cardBrand: "",
    cardLast4: "",
    cardExp: "",
    status: "",
    isLoading: true,
  });

  useEffect(() => {
    getSubDetails();
    // eslint-disable-next-line
  }, []);

  async function getSubDetails() {
    setDetails(d => ({ ...d, isLoading: true }));

    // Nova função edge chamada 'get-stripe-details'
    const { data, error } = await supabase.functions.invoke('get-stripe-details');
    if (error) {
      setDetails(d => ({ ...d, isLoading: false, error: error.message }));
      return;
    }
    setDetails({
      plan: data.plan_name,
      amount: data.amount,
      cardBrand: data.card_brand,
      cardLast4: data.card_last4,
      cardExp: `${data.exp_month}/${data.exp_year}`,
      status: data.status,
      isLoading: false,
      subscriptionId: data.subscription_id
    });
  }

  return details;
}
