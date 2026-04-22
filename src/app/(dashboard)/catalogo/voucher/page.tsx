export const dynamic = "force-dynamic";

import { getVouchers } from "@/lib/actions/vouchers";
import { VoucherClient } from "./voucher-client";

type Voucher = {
  id: string;
  codice: string;
  tipo: string;
  valore: number;
  usato: boolean;
  data_scadenza: string | null;
  descrizione: string | null;
  created_at: string;
};

export default async function V2CatalogoVoucherPage() {
  const raw = (await getVouchers()) as unknown as Array<
    Voucher & { [k: string]: unknown }
  >;
  const vouchers: Voucher[] = raw.map((v) => ({
    id: v.id,
    codice: v.codice,
    tipo: v.tipo,
    valore: Number(v.valore),
    usato: v.usato,
    data_scadenza: v.data_scadenza,
    descrizione: v.descrizione,
    created_at: v.created_at,
  }));

  return <VoucherClient vouchers={vouchers} />;
}
