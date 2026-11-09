# Riviera SOS preview configuration

The design/riviera-one-page preview displays Account independently of the billing feature switch. With membership disabled, it links to the existing private billing account preview; it does not enable purchase gating in the design preview. Enabled membership continues to use its local account page.

SOS obtains device location only after the user chooses Use my current location. BigDataCloud suggests the country; if GPS fails, an IP-based suggestion requires explicit confirmation before displaying a dial link. Coordinates and reported accuracy remain available even if country or street lookup fails. Location is not stored in the account or sent to emergency services.

Street lookup requires the server-only SOS_GEOCODING_API_KEY in this preview environment, with Google Geocoding enabled, billing configured, API restrictions and a provider quota. It is currently optional: without the key the endpoint returns no address and the interface displays coordinates honestly. Reverse geocoding is a nearby-address estimate, never a guarantee of an exact street. Do not expose this key in NEXT_PUBLIC variables. No production environment changes are included.

Validation: TypeScript, production build and 25 focused tests (including prompt preservation, SOS failure/cancellation, coordinate accuracy, origin validation and provider failure). Mobile layout checked at 390px: Account is visible, panel backgrounds are transparent and no horizontal overflow. Manual Italy selection produces tel:112; no emergency call or real device-location transmission was made during testing.
