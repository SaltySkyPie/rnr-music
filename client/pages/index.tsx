import type { NextPage } from 'next'
import Image from 'react-bootstrap/Image'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faGoogle, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faPlay, faPause, faForwardFast, faBackwardFast } from "@fortawesome/free-solid-svg-icons"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button, Form, Modal } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import Slider from "rc-slider"
import Table from 'react-bootstrap/Table';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import toast from 'react-hot-toast'
import { useRouter } from 'next/router';

let rap: any = {}
let remoteMusicLoc = "http://localhost"
const wsHost = 'wss://skippies.fun/music/ws'
//const wsHost = "ws://localhost:8081"



export async function getStaticProps(ctx: any) {
    const { req, query, res, asPath, pathname } = ctx;
    let host = ""
    if (req) {
        host = req.headers.host
    }
    return {
        props: {
            remoteMusic: process.env.REMOTE_MUSIC,
            host: host
        }
    }
}

const Home: NextPage = ({ remoteMusic, host }: any) => {

    const { data, status } = useSession()

    const router = useRouter()

    remoteMusicLoc = remoteMusic

    const getUniqueID = () => {
        return Math.floor(5000 + Math.random() * 9000);
    };

    const [joined, setJoined] = useState(false)
    const [timestamp, setTimeStamp] = useState(0)
    const [maxTimestamp, setMaxTimestamp] = useState(0)
    const [allowUpdate, setAllowUpdate] = useState(true)
    const [currentSong, setCurrentSong] = useState("Select a song!")
    const [songList, setSongList] = useState<any>(false)
    const [currentSongUrl, setCurrentSongUrl] = useState("")
    const [playerStatus, setPlayerStatus] = useState<"playing" | "idle" | "paused">("idle")
    const [previousSongs, setPreviousSongs] = useState<string[]>([])
    const [sessionId, setSessionId] = useState<any>("")
    const [wsLogin, setWsLogin] = useState(false)
    const [allowWsSongUpdate, setAllowWsSongUpdate] = useState(false)
    const [wsReady, setWsReady] = useState(false)
    const [client, setClient] = useState<W3CWebSocket>()
    const [modalShow, setModalShow] = useState(false)
    const [sessionUserId, setSessionUserId] = useState("")
    const [allowWsPlayingUpdate, setAllowWsPlayingUpdate] = useState(false)
    const [playRateLimit, setPlayRateLimit] = useState(0)



    // type defs for WS comms
    const typeDefinition = {
        LOGIN: "login",
        PAUSE: "pause",
        PLAY: "play",
        SONG_UPDATE: "song_update",
        MESSAGE: "msg"
    }

    // set next song on button click
    const nextSong = () => {
    }

    // set prev. song on button click
    const previousSong = () => {

    }

    // change or resume song
    const play = () => {
    }

    // pause song
    const pause = () => {
    }

    // show invite modal on load with link
    useEffect(() => {
        if (router.query.join) {
            setSessionId(router.query.join)
        }

        if (!joined && sessionId && status === "authenticated" && !modalShow && router.query.join) {
            setModalShow(true)
        }
    }, [router, sessionId, status])


    // trigger song list render on load and store song list in a variable
    const renderSongs = async () => {
        const l = await (await fetch('/api/getSongs')).json()
        setSongList(l)
    }

    // render songs on load
    useEffect(() => {
        renderSongs()
    }, [])


    // create WS client on joining event
    useEffect(() => {
        if (joined) {
            setClient(new W3CWebSocket(wsHost))
        }
    }, [joined])

    // events after connecting to WS se
    useEffect(() => {
        if (joined && client != undefined) {
            client!.onopen = () => {
                console.log(`Connected to ${wsHost}`)
                setWsReady(true)
                toast.success(`Connected to server and joined session ${sessionId}`)
            }
            client!.onclose = () => {
                toast("Disconnected from the server.");
                setJoined(false);
                setWsReady(false);
                setWsLogin(false);
                setClient(undefined);
                setSessionId("");

            }
            client!.onerror = () => {
                toast.error("Lost connection to the server. :(");
                setJoined(false);
                setWsReady(false);
                setWsLogin(false);
                setClient(undefined);
            }
        }

        if (!joined) {

            setPreviousSongs([])
            setCurrentSong("")
            setCurrentSongUrl("")
            setTimeStamp(0)
        }

    }, [client, joined])


    // login user to WS server after connection
    const logInUser = () => {
        const username = data!.user!.name!;
        if (username.trim()) {
            const sdata = {
                username: username, sessionId: sessionId
            };
            client!.send(JSON.stringify({
                ...sdata,
                type: typeDefinition.LOGIN
            }));
        }
        setAllowWsSongUpdate(true)
        setWsLogin(true)
        setAllowWsPlayingUpdate(true)
    }


    // WS message processing
    useEffect(() => {
        if (status === "authenticated" && wsReady) {
            logInUser();
            client!.onmessage = (message: any) => {
                const dat = JSON.parse(message.data as string)
                console.log(dat)

                if (dat.sessionId != sessionId) return;

                switch (dat.type) {
                    case typeDefinition.PLAY:
                        if (dat.userId != sessionUserId) {
                        }
                        break
                    case typeDefinition.PAUSE:
                        if (dat.userId != sessionUserId) {
                        }
                        break
                    case typeDefinition.SONG_UPDATE:
                        if (dat.userId != sessionUserId) {
                        }
                        break
                    case typeDefinition.MESSAGE:
                        toast(`${dat.data.message}`, { icon: '✉️' })
                        break
                    case typeDefinition.LOGIN:
                        setSessionUserId(dat.data.userId)
                        break
                    default:
                        break
                }



            }
        }
    }, [status, wsReady])


    // update display of timestamp and song name
    useEffect(() => {
    }, [timestamp, currentSongUrl])



    // check for song end -> if ends play a new song
    useEffect(() => {
    }, [allowUpdate])


    return (
        <main className='container'>
            {!data?.user && status !== "authenticated" ?
                <>
                    <div className='text-center my-5'>
                        <Image src='/logo.png'></Image>
                        <h1>TŠ TWIST MUSIC SYSTEM</h1>
                    </div>
                    <div className='text-center'>
                        <h2>Login with:</h2>
                        <div className="my-3">
                            <FontAwesomeIcon icon={faFacebook} size="3x" className="m-3" onClick={() => { signIn("facebook") }}></FontAwesomeIcon>
                            <FontAwesomeIcon icon={faInstagram} size="3x" className="m-3" onClick={() => { signIn("instagram") }}></FontAwesomeIcon>
                            <FontAwesomeIcon icon={faGoogle} size="3x" className="m-3" onClick={() => { signIn("google") }}></FontAwesomeIcon>
                        </div>
                    </div>
                </>
                :
                <>
                    {joined ? <>
                        {wsReady ? <>
                            <div className='absolute-wrap'>
                                <div className="text-center my-4 container">
                                    <p>{currentSong}</p>
                                    <ReactAudioPlayer
                                        ref={(element) => { rap = element; }}
                                        src={currentSongUrl}
                                        autoPlay
                                        listenInterval={100}
                                        onListen={(e) => { /* update timestamp */}}
                                        onPause={(e) => { setPlayerStatus("paused") }}
                                        onPlay={(e) => { setPlayerStatus("playing") }}
                                        preload={"auto"}
                                        controls
                                        style={{ "display": "none" }}
                                    />
                                    <h1>{secondsToString(Math.floor(timestamp))} / {secondsToString(Math.floor(maxTimestamp))}</h1>

                                    <Slider
                                        max={maxTimestamp}
                                        min={0}
                                        defaultValue={0}
                                        value={Math.floor(timestamp)}
                                        ariaLabelForHandle={`${timestamp}`}
                                        ariaValueTextFormatterForHandle={(value) => { return secondsToString(Math.floor(value)) }}
                                        ariaLabelledByForHandle={`${timestamp}`}
                                        included={true}
                                        onBeforeChange={() => { /* before onChange */ }}
                                        onAfterChange={() => { /* after onChange */ }}
                                        onChange={(value) => { /* slider change */ }}
                                        style={{ "width": "80%", "margin": "0 auto" }}
                                    />

                                    <div className="m-2">
                                        {allowWsPlayingUpdate ? <>
                                            {previousSongs.length > 1 ?
                                                <FontAwesomeIcon icon={faBackwardFast} size="2x" className='mx-3' onClick={previousSong}></FontAwesomeIcon> : null}
                                            {(playerStatus == "idle" || playerStatus == "paused") ?
                                                <FontAwesomeIcon icon={faPlay} size="2x" className='mx-3' onClick={play}></FontAwesomeIcon>
                                                :
                                                <FontAwesomeIcon icon={faPause} size="2x" className='mx-3' onClick={pause}></FontAwesomeIcon>
                                            }
                                            <FontAwesomeIcon icon={faForwardFast} size="2x" className='mx-3' onClick={nextSong}></FontAwesomeIcon>
                                        </> : <>
                                            <p>...</p>
                                        </>}
                                    </div>

                                </div>
                            </div>
                            <div className="text-center login-container">
                                <p>Logged in as {data?.user?.name} <Button onClick={() => { signOut() }} size="sm">Logout</Button></p>
                                <p>Session ID: {sessionId} <Button onClick={() => { setJoined(false); setWsReady(false); setWsLogin(false); client?.close(); setClient(undefined); toast.success(`Left session ${sessionId}`); setSessionId(""); }} size="sm">Leave</Button></p>
                            </div>
                            <div className="text-center songlist">
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>Song</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <SongList list={songList} setter={setCurrentSongUrl} currentSong={currentSongUrl} timestampSetter={setTimeStamp} prevSetter={setPreviousSongs} prev={previousSongs} />
                                    </tbody>
                                </Table>
                            </div>
                        </> : <>
                            <div className="absolute-center">
                                <div className="text-center">
                                    <div className="loader">Loading...</div>
                                    <p>Joining session {sessionId}...</p>
                                </div>
                            </div>
                        </>}
                    </> : <>
                        <Modal
                            size="lg"
                            show={modalShow}
                            onHide={() => setModalShow(false)}
                            backdrop="static"
                        >
                            <Modal.Header>
                                <Modal.Title>
                                    Join session {sessionId}?
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <p>You were invited to join session {sessionId}. Do you wanna join?</p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button onClick={() => { setModalShow(false); setJoined(true); router.push({ pathname: '/', query: {} }, undefined, { shallow: true }) }}>Join</Button>
                                <Button onClick={() => { setModalShow(false); }}>Start different session</Button>
                            </Modal.Footer>

                        </Modal>
                        <div className="text-center my-5 container">
                            <h1>Welcome back {data?.user?.name}!</h1>
                            <div className='text-center my-3'>
                                <Button onClick={() => { setSessionId(getUniqueID); setJoined(true); router.push({ pathname: '/', query: {} }, undefined, { shallow: true }) }}>Create Session</Button>{' '}
                            </div>
                            <div className="text-center my-3">
                                <Form.Control type="text" placeholder="Session ID" className="my-2" value={sessionId} onChange={(e) => { setSessionId(e.target.value); }} />
                                <Button onClick={() => { if (!sessionId.length) { toast.error("Session ID cannot be empty!"); return } setJoined(true); router.push({ pathname: '/', query: {} }, undefined, { shallow: true }) }}>Join Session</Button>
                            </div>
                            <p>Logged in as {data?.user?.name} <Button onClick={() => { signOut() }} size="sm">Logout</Button></p>
                        </div>
                    </>}
                </>}
        </main>
    )
}

export default Home


function getSafe(fn: any, defaultVal: any = {}) {
    try {
        return fn();
    } catch (e) {
        return defaultVal;
    }
}


function secondsToString(seconds: number) {
    var numyears = Math.floor(seconds / 31536000);
    var numdays = Math.floor((seconds % 31536000) / 86400);
    var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;

    if (isNaN(numminutes) || isNaN(numseconds)) {
        return "-:--"
    }

    const final = (numyears ? numyears + ":" : "") + (numdays ? numdays + ":" : "") + (numhours ? numhours + ":" : "") + numminutes + ":" + (numseconds < 10 ? `0${numseconds}` : numseconds)

    return final;

}


function SongList({ list, setter, currentSong, timestampSetter, prevSetter, prev }: any) {
    return list ? list.map((l: any) => <Song file={l} setter={setter} currentSong={currentSong} timestampSetter={timestampSetter} prevSetter={prevSetter} prev={prev} key={l}></Song>) : null;

}


function Song({ file, setter, currentSong, timestampSetter, prevSetter, prev }: any) {
    return <>
        <tr><td><p className='text-start'>{file}</p></td><td><FontAwesomeIcon icon={faPlay} size="2x" onClick={() => {  /* play song */}}></FontAwesomeIcon></td></tr>
    </>
}


