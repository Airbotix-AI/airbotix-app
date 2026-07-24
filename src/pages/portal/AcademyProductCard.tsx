import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getAcademyProduct, type AcademyCatalogProduct } from '@/pages/learn/academy/academyApi';

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);

interface AcademyProductCardProps {
  examTitle: string;
  owners: string[];
  product: AcademyCatalogProduct;
}

export function AcademyProductCard({ examTitle, owners, product }: AcademyProductCardProps) {
  const details = useQuery({
    queryKey: ['academy-public-product', product.slug],
    queryFn: () => getAcademyProduct(product.slug),
    retry: false,
  });
  const questionCount = details.data?._count.question_links;

  return (
    <article className="card-base flex min-h-[330px] flex-col border-2 border-transparent transition-transform duration-200 hover:-translate-y-1 hover:border-brand-sky">
      <div className="flex items-start justify-between gap-4">
        <span className="sticker-sky alt">{product.level_key}</span>
        {owners.length > 0 && <span className="sticker-mint">Unlocked</span>}
      </div>
      <h3 className="mt-6 text-[24px] font-black leading-tight text-ink">
        {examTitle} {product.level_key}
      </h3>
      <p className="mt-2 text-[15px] font-bold text-brand-sky">{product.subject_key} practice</p>
      <ul className="mt-5 space-y-2 text-[14px] font-medium text-ink-soft">
        <li data-testid={`academy-question-count-${product.slug}`}>
          ✓{' '}
          {questionCount === undefined
            ? `Questions matched to ${product.level_key}`
            : `${questionCount} practice questions available now`}
        </li>
        <li>✓ Immediate answer feedback</li>
        <li>✓ Attempts and accuracy recorded</li>
      </ul>
      <div className="mt-auto pt-7">
        {owners.length > 0 && (
          <p className="mb-3 text-[13px] font-black text-brand-mint">
            Already unlocked for {owners.join(', ')}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[27px] font-black text-ink">{money(product.price_aud_cents)}</div>
            <div className="text-[12px] font-bold text-slate2">
              {product.access_days} days · one child
            </div>
          </div>
          <Link
            to={`/portal/academy/checkout/${product.slug}`}
            className="btn-pill-primary"
            data-testid={`academy-buy-${product.slug}`}
            aria-label={`Choose ${product.title} for a child`}
          >
            {owners.length > 0 ? 'Choose another child →' : `Choose ${product.level_key} →`}
          </Link>
        </div>
      </div>
    </article>
  );
}
