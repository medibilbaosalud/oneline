export default function SuperDebugLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                    <h1>SUPER DEBUG MODE</h1>
                    <p>If you see this, you are in a completely isolated environment.</p>
                    <hr />
                    {children}
                </div>
            </body>
        </html>
    );
}
