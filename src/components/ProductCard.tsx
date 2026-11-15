import React, { useState } from 'react';
import { FileText, ShoppingCart, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatMoneyFromUsdCents } from '../shared/commerce';

export interface ProductCardData {
  id: number;
  title: string;
  priceUsdCents: number;
  coverUrl: string;
  productType: string;
  salesCount: number;
  ratingAvgScaled: number;
  reviewsCount: number;
  storeName: string;
  storeSlug: string;
  categoryNameFr?: string;
  categoryNameEn?: string;
  categoryNameHt?: string;
}

export const ProductCard: React.FC<{ product: ProductCardData }> = ({ product }) => {
  const { currency, lang, t, navigate, addToCart } = useApp();
  const [imgError, setImgError] = useState(false);

  const categoryLabel =
    lang === 'en'
      ? product.categoryNameEn || product.productType
      : lang === 'ht'
        ? product.categoryNameHt || product.productType
        : product.categoryNameFr || product.productType;

  const rating = product.ratingAvgScaled > 0 ? (product.ratingAvgScaled / 100).toFixed(1) : '5.0';

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`/product/${product.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/product/${product.id}`);
        }}
        className="block relative aspect-[4/3] bg-slate-100 overflow-hidden"
      >
        {!imgError && product.coverUrl ? (
          <img
            src={product.coverUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex flex-col items-center justify-center p-6 text-center text-white">
            <FileText className="w-8 h-8 text-blue-400 mb-2" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-300 line-clamp-2">{product.title}</span>
          </div>
        )}
      </a>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">{categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{product.salesCount} {t.product.sales}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5 tabular-nums text-slate-700 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {rating}
            </span>
          </div>

          <h3 className="text-base font-display font-semibold text-slate-950 leading-snug line-clamp-2">
            <a
              href={`/product/${product.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/product/${product.id}`);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              {product.title}
            </a>
          </h3>

          <p className="text-xs text-slate-500">
            {t.product.soldBy}{' '}
            <a
              href={`/store/${product.storeSlug}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/store/${product.storeSlug}`);
              }}
              className="font-medium text-slate-700 hover:text-blue-600 underline-offset-2 hover:underline"
            >
              {product.storeName}
            </a>
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-base font-mono font-semibold tabular-nums text-slate-950">
            {formatMoneyFromUsdCents(product.priceUsdCents, currency)}
          </span>
          <button
            type="button"
            onClick={() =>
              addToCart({
                id: product.id,
                title: product.title,
                priceUsdCents: product.priceUsdCents,
                coverUrl: product.coverUrl,
                storeName: product.storeName,
                storeSlug: product.storeSlug,
                productType: product.productType,
              })
            }
            aria-label={`${t.product.addToCart} : ${product.title}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.product.addToCart}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
