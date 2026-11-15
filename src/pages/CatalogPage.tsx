import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard, type ProductCardData } from '../components/ProductCard';

export const CatalogPage: React.FC<{ initialCategoriesOnly?: boolean }> = ({ initialCategoriesOnly = false }) => {
  const { categories, lang, navigate, route } = useApp();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sort, setSort] = useState<string>('popular');

  useEffect(() => {
    const queryStr = route.split('?')[1] || '';
    const params = new URLSearchParams(queryStr);
    const cat = params.get('category');
    if (cat) setSelectedCategory(cat);
  }, [route]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    params.set('sort', sort);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, selectedCategory, sort]);

  const getCatName = (c: (typeof categories)[number]) =>
    lang === 'en' ? c.nameEn : lang === 'ht' ? c.nameHt : c.nameFr;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-950">
            {initialCategoriesOnly ? 'Toutes les catégories numériques' : 'Catalogue des produits numériques'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ebooks PDF, formations vidéo, modèles Canva, Excel, logiciels et packs de prompts IA.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou vendeur..."
              aria-label="Rechercher un produit"
              className="pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:border-blue-600"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Trier les produits"
            className="px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          >
            <option value="popular">Plus populaires</option>
            <option value="newest">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {/* Interactive Category Filter Buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-slate-950 text-white border-slate-950'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
          }`}
        >
          Toutes ({categories.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              selectedCategory === cat.slug
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            {getCatName(cat)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-medium text-slate-900">Aucun produit ne correspond à cette recherche.</p>
          <p className="text-sm text-slate-600">Essayez une autre catégorie ou réinitialisez vos filtres.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              navigate('/catalog');
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
