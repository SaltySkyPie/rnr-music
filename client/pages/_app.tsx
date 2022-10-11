import '../styles/globals.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'rc-slider/assets/index.css';
import { Toaster } from 'react-hot-toast'
import { SessionProvider, useSession } from "next-auth/react"

function MyApp({ Component, pageProps: { session, ...pageProps } }: any) {
    return <>
        <Toaster
            position="top-center"
            reverseOrder={true}
        />
        <title>TŠ TWIST MUSIC SYSTEM</title>
        <SessionProvider session={session}>
            {Component.auth ? (
                <Auth>
                    <Component {...pageProps} />
                </Auth>
            ) : (<>
                <Component {...pageProps} />
            </>
            )}
        </SessionProvider>
    </>
}

export default MyApp


function Auth({ children }: any) {
    const { data: session, status } = useSession({ required: true })
    const isUser = !!session?.user

    if (isUser) {
        return children
    }
    return <div>Loading...</div>
}