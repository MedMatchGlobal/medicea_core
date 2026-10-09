import { HealthLanguage } from '../health-i18n/HealthLanguage';
export default function AccountLayout({children}: {children: React.ReactNode}) {
  return <HealthLanguage>{children}</HealthLanguage>;
}
