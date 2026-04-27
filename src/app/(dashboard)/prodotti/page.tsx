export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, AlertTriangle, Package, Pencil } from "lucide-react";
import { getProducts } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/utils";
import { StockControls } from "@/components/prodotti/stock-controls";

type Product = Awaited<ReturnType<typeof getProducts>>[number];

export default async function ProdottiPage() {
 const products = await getProducts();

 // Group by categoria
 const grouped: Record<string, Product[]> = {};
 for (const p of products) {
  if (!grouped[p.categoria ?? "altro"]) grouped[p.categoria ?? "altro"] = [];
  grouped[p.categoria ?? "altro"].push(p);
 }

 const categorie = Object.keys(grouped).sort();
 const lowStockCount = products.filter((p) => p.low_stock).length;

 return (
  <div>
   {/* Header */}
   <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <h1 className="font-display text-3xl font-bold text-brown">
      Prodotti
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">
      {products.length} prodotti
      {lowStockCount > 0 && (
       <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        {lowStockCount} scorte basse
       </span>
      )}
     </p>
    </div>
    <Link
     href="/prodotti/nuovo"
     className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
    >
     <Plus className="h-4 w-4" />
     Nuovo Prodotto
    </Link>
   </div>

   {products.length === 0 ? (
    <div className="rounded-xl border border-border bg-card p-12 text-center ">
     <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
     <p className="text-sm text-muted-foreground">Nessun prodotto</p>
     <Link
      href="/prodotti/nuovo"
      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
     >
      <Plus className="h-4 w-4" />
      Aggiungi Prodotto
     </Link>
    </div>
   ) : (
    <div className="space-y-8">
     {categorie.map((categoria) => (
      <div key={categoria}>
       <h2 className="mb-4 font-semibold capitalize text-brown">{categoria}</h2>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grouped[categoria].map((product) => (
         <div
          key={product.id}
          className={`rounded-xl border bg-card p-5 ${product.low_stock ? "border-amber-300" : "border-border"}`}
         >
          <div className="flex items-start justify-between gap-2">
           <h3 className="font-semibold text-brown">{product.nome}</h3>
           <div className="flex shrink-0 items-center gap-1">
            {product.low_stock && (
             <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Bassa
             </span>
            )}
            <Link
             href={`/prodotti/${product.id}/modifica`}
             className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:border-rose/30 hover:text-rose"
             title="Modifica"
            >
             <Pencil className="h-3.5 w-3.5" />
            </Link>
           </div>
          </div>
          {product.descrizione && (
           <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {product.descrizione}
           </p>
          )}
          <div className="mt-4 flex items-center justify-between">
           <div>
            <p className="text-xs text-muted-foreground">Prezzo</p>
            <p className="font-semibold text-brown">
             {formatCurrency(Number(product.prezzo))}
            </p>
           </div>
           <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-muted-foreground">Giacenza</p>
            <StockControls
             productId={product.id}
             initialGiacenza={product.giacenza}
             sogliaAlert={product.soglia_alert ?? 5}
            />
            {product.low_stock && (
             <p className="text-xs text-amber-500">
              Soglia: {product.soglia_alert}
             </p>
            )}
           </div>
          </div>
         </div>
        ))}
       </div>
      </div>
     ))}
    </div>
   )}
  </div>
 );
}
