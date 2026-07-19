import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getAcademyOrder } from '@/pages/learn/academy/academyApi';

export function AcademyOrderPage() {
  const { intentId = '' } = useParams<{ intentId: string }>();
  const order = useQuery({
    queryKey: ['academy-order', intentId],
    queryFn: () => getAcademyOrder(intentId),
    enabled: intentId !== '',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === undefined ? 2_000 : false;
    },
  });

  const unlocked =
    order.data?.status === 'succeeded' && order.data.entitlement?.status === 'active';
  return (
    <div className="card-base max-w-2xl text-center" data-testid="academy-order-status">
      {unlocked ? (
        <>
          <span className="sticker-mint">Unlocked</span>
          <h1 className="section-heading mt-4">Exam prep is ready ✓</h1>
          <p className="lead-text mt-3">
            Payment is confirmed and the product is now available in your child&apos;s My Exam Prep.
          </p>
        </>
      ) : order.data?.status === 'failed' || order.data?.status === 'cancelled' ? (
        <>
          <span className="sticker-coral">Payment not completed</span>
          <p className="lead-text mt-4">No exam access was granted. You can try again safely.</p>
        </>
      ) : (
        <>
          <span className="sticker-sky alt">Confirming payment…</span>
          <p className="lead-text mt-4">
            Please wait while we confirm payment and unlock the product. Don&apos;t pay again.
          </p>
        </>
      )}
      <Link to="/portal/academy" className="btn-pill-primary mt-6 inline-block">
        My exam products
      </Link>
    </div>
  );
}
