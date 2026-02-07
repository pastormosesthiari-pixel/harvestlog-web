import "./globals.css";

export const metadata = {
  title: "HarvestLog",
  description: "HarvestLog Evangelism System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
