import { PolarEmbedCheckout } from '@polar-sh/checkout/embed';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAction } from 'convex/react';
import type { PolarComponentApi } from '@convex-dev/polar';
import { cn, formatError } from '@/lib/utils';

type PolarCheckoutLinkProps = PropsWithChildren<{
  polarApi: Pick<PolarComponentApi, 'generateCheckoutLink'>;
  productIds: string[];
  subscriptionId?: string;
  className?: string;
  theme?: 'dark' | 'light';
  embed?: boolean;
  onError?: (message: string) => void;
}>;

export function PolarCheckoutLink({
  polarApi,
  productIds,
  children,
  className,
  subscriptionId,
  theme = 'dark',
  embed = true,
  onError,
}: PolarCheckoutLinkProps) {
  const generateCheckoutLink = useAction(polarApi.generateCheckoutLink);
  const [checkoutLink, setCheckoutLink] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const productIdsSerialized = useMemo(() => JSON.stringify(productIds), [productIds]);
  const stableProductIds = useMemo(
    () => JSON.parse(productIdsSerialized) as string[],
    [productIdsSerialized]
  );

  useEffect(() => {
    let isActive = true;

    if (embed) {
      PolarEmbedCheckout.init();
    }

    setCheckoutLink(undefined);
    setError(null);

    void (async () => {
      try {
        const { url } = await generateCheckoutLink({
          productIds: stableProductIds,
          subscriptionId,
          origin: window.location.origin,
          successUrl: window.location.href,
        });
        if (isActive) {
          setCheckoutLink(url);
        }
      } catch (err) {
        const message = formatError(err);
        if (isActive) {
          setError(message);
          onError?.(message);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [stableProductIds, subscriptionId, embed, generateCheckoutLink, onError]);

  const isReady = Boolean(checkoutLink);

  return (
    <>
      <a
        className={cn(!isReady && 'pointer-events-none opacity-60', className)}
        href={checkoutLink}
        data-polar-checkout-theme={theme}
        {...(embed ? { 'data-polar-checkout': true } : {})}
        {...(!isReady ? { 'aria-disabled': true } : {})}
      >
        {children}
      </a>
      {error && !onError && (
        <p className="text-destructive mt-2 text-xs">An error occured. Please try again later.</p>
      )}
    </>
  );
}
