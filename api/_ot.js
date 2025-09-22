    headers: authHeaders(),
  });
  const txt = await res.text();
  if (DEBUG) console.log(`[OT] GET /customer?id=${id} -> ${res.status} ${txt.slice(0,220)}`);
  if (!res.ok) throw new Error(`/customer ${res.status}: ${txt.slice(0,300)}`);
  const x = safeJSON(txt) || {};

  // Normalize to the structure your UI expects
  return {
    company: x.Company || x.CompanyName || x.Name || '',
    billing: {
      contact: x.BillingContact || '',
      phone:   x.BillingPhone   || '',
      email:   x.BillingEmail   || '',
      street:  x.BillingAddress1 || x.BillingAddress || '',
      suite:   x.BillingAddress2 || '',
      city:    x.BillingCity     || '',
      state:   x.BillingState    || '',
      zip:     x.BillingZip      || '',
    },
    shipping: {
      company:   x.ShipToCompany || x.Company || '',
      contact:   x.ShipToContact || '',
      phone:     x.ShipToPhone   || '',
      email:     x.ShipToEmail   || '',
      street:    x.ShipToAddress1 || '',
      suite:     x.ShipToAddress2 || '',
      city:      x.ShipToCity     || '',
      state:     x.ShipToState    || '',
      zip:       x.ShipToZip      || '',
      residence: !!x.ShipToIsResidential,
    },
    payment: {
      method:    x.DefaultPaymentMethod || '',
      terms:     x.PaymentTerms         || '',
      taxExempt: !!x.IsTaxExempt,
      agreement: !!x.HasPurchaseAgreement,
    },
    shippingOptions: {
      pay:      x.DefaultShipPaymentMethod || '',
      speed:    x.DefaultShipSpeed         || '',
      shortShip: x.ShortShipPolicy || '',
    },
    carrierRep: { name: x.CarrierRepName || '', email: x.CarrierRepEmail || '' },
    rep:        { primary: x.PrimaryRepName || '', secondary: x.SecondaryRepName || '' },
  };
}
