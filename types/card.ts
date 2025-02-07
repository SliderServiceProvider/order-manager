export interface Card {
  id: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  last4: string;
  funding: string;
  created: number;
  card_holder_name: string;
  is_default: boolean;
}

export interface CardFormData {
  payment_method_id: string;
  exp_month: number;
  exp_year: number;
}
