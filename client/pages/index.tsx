import type { NextPage } from "next";
import Image from "react-bootstrap/Image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
  faPlay,
  faPause,
  faForwardFast,
  faBackwardFast,
  faUser,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button, Container, Form, Modal, Nav, Navbar } from "react-bootstrap";
import { useEffect, useState } from "react";
import ReactAudioPlayer from "react-audio-player";
import Slider from "rc-slider";
import Table from "react-bootstrap/Table";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import ReactPlayer from "react-player";
import Head from "next/head";

let rap: any = {};
let remoteMusicLoc = "file:///home/saltyskypie/Music/";
const wsHost = "wss://skippies.fun/music/ws";
//const wsHost = "ws://localhost:8081";

export async function getStaticProps(ctx: any) {
  const { req, query, res, asPath, pathname } = ctx;
  let host = "";
  if (req) {
    host = req.headers.host;
  }
  return {
    props: {
      remoteMusic: process.env.REMOTE_MUSIC,
      host: host,
    },
  };
}

const Home: NextPage = ({ remoteMusic, host }: any) => {
  const { data, status } = useSession();

  const router = useRouter();

  remoteMusicLoc = remoteMusic;

  const getUniqueID = () => {
    return Math.floor(1000 + Math.random() * 9000);
  };

  const [joined, setJoined] = useState(false);
  const [timestamp, setTimestamp] = useState(0);
  const [maxTimestamp, setMaxTimestamp] = useState(0);
  const [currentSong, setCurrentSong] = useState("Select a song!");
  const [songList, setSongList] = useState<any>(false);
  const [currentSongUrl, setCurrentSongUrl] = useState("");
  const [playerStatus, setPlayerStatus] = useState<
    "playing" | "idle" | "paused"
  >("idle");
  const [previousSongs, setPreviousSongs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<any>("");
  const [wsLogin, setWsLogin] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [client, setClient] = useState<W3CWebSocket>();
  const [modalShow, setModalShow] = useState(false);
  const [sessionUserId, setSessionUserId] = useState("");
  const [activeUsers, setActiveUsers] = useState(0);
  const [sliderInteraction, setSliderInteraction] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [showError, setShowError] = useState(false);
  const [wsBusy, setWsBusy] = useState(false);
  const [songsLoaded, setSongsLoaded] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [audioLoading, setAudioLoading] = useState(true);
  const [title, setTitle] = useState("TŠ TWIST MUSIC SYSTEM");
  const [muted, setMuted] = useState(true);
  const [controller, setController] = useState(false);
  const [afterSongUpdate, setAfterSongUpdate] = useState(false);

  const toggleVisible = () => {
    const scrolled = document.documentElement.scrollTop;
    if (scrolled > 300) {
      setVisible(true);
    } else if (scrolled <= 300) {
      setVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", toggleVisible);
  }

  // type defs for WS comms
  const typeDefinition = {
    LOGIN: "login",
    PAUSE: "pause",
    PLAY: "play",
    SONG_UPDATE: "song_update",
    TIME_UPDATE: "time_update",
    MESSAGE: "msg",
    GET: "get",
  };

  // show invite modal on load with link
  useEffect(() => {
    if (router.query.join) {
      setSessionId(router.query.join);
    }

    if (
      !joined &&
      sessionId &&
      status === "authenticated" &&
      !modalShow &&
      router.query.join
    ) {
      setModalShow(true);
    }
  }, [router, sessionId, status]);

  // trigger song list render on load and store song list in a variable
  const renderSongs = async () => {
    const l = await (await fetch("/api/getSongs")).json();
    setSongList(l);
    let c: string[] = [];
    for (const category of l) {
      c = [...c, category.name];
    }
    setCategories(c);
    console.log(l);
    console.log(c);
    setSongsLoaded(true);
  };

  // render songs on load
  useEffect(() => {
    renderSongs();
  }, []);

  // create WS client on joining event
  useEffect(() => {
    if (joined) {
      setClient(new W3CWebSocket(wsHost));
    }
  }, [joined]);

  // events after connecting to WS se
  useEffect(() => {
    if (joined && client != undefined) {
      client!.onopen = () => {
        console.log(`Connected to ${wsHost}!`);
        setWsReady(true);
        toast.success(`Connected to server and joined session ${sessionId}!`, {
          duration: 1000,
        });
      };
      client!.onerror = () => {
        toast.error("Lost connection to the server. :(", { duration: 1000 });
        setJoined(false);
        setWsReady(false);
        setWsLogin(false);
        setClient(undefined);
        setShowError(true);
      };
      client!.onclose = () => {
        setJoined(false);
        setWsReady(false);
        setWsLogin(false);
        setClient(undefined);
      };
    }

    if (!joined) {
      setPreviousSongs([]);
      setCurrentSong("");
      setCurrentSongUrl("");
      setTimestamp(0);
      setMaxTimestamp(0);
    }
  }, [client, joined]);

  // login user to WS server after connection
  const logInUser = () => {
    const username = data!.user!.name!;
    if (username.trim() && sessionId) {
      const sdata = {
        username: username,
        sessionId: sessionId,
      };
      client!.send(
        JSON.stringify({
          ...sdata,
          type: typeDefinition.LOGIN,
        })
      );
    }
  };

  // WS message processing
  useEffect(() => {
    if (status === "authenticated" && wsReady) {
      logInUser();
      if (controller) {
        setInterval(() => {
          client?.send(JSON.stringify({ type: typeDefinition.GET }));
        }, 500);
      }
      client!.onmessage = (message: any) => {
        setWsBusy(true);
        const dat = JSON.parse(message.data as string);
        console.log(dat);
        //toast(JSON.stringify(dat))
        if (dat.sessionId != sessionId) return;

        switch (dat.type) {
          case typeDefinition.MESSAGE:
            toast(`${dat.data.message}`, { icon: "✉️", duration: 1000 });
            break;
          case typeDefinition.LOGIN:
            setSessionUserId(dat.data.userId);
            setCurrentSongUrl(dat.data.sessionData.currentSongUrl);
            if (!controller) {
              rap.seekTo(dat.data.sessionData.songTimestamp, "seconds");
              setTimestamp(rap.getCurrentTime());
              setMaxTimestamp(rap.getDuration());
            } else {
              setTimestamp(dat.data.sessionData.songTimestamp);
              setMaxTimestamp(dat.data.sessionData.songMaxTimestamp);
            }
            setPlayerStatus(dat.data.sessionData.songState);
            setWsLogin(true);
            break;
          default:
            setMuted(true);
            if (!(dat.type == "pause" || dat.type == "play")) {
              setAudioLoading(true);
            }
            setCurrentSongUrl(dat.data.sessionData.currentSongUrl);
            if (!controller) {
              rap.seekTo(dat.data.sessionData.songTimestamp, "seconds");
              setTimestamp(rap.getCurrentTime());
              setMaxTimestamp(rap.getDuration());
            } else {
              setTimestamp(dat.data.sessionData.songTimestamp);
              setMaxTimestamp(dat.data.sessionData.songMaxTimestamp);
            }
            if (
              dat.type == "song_update" &&
              dat.data.sessionData.songState == "paused"
            ) {
              setAfterSongUpdate(true);
            } else {
              setAfterSongUpdate(false);
              setPlayerStatus(dat.data.sessionData.songState);
            }
            break;
        }

        setActiveUsers(Object.keys(dat.data.sessionData.connectedUsers).length);
        setTimeout(() => {
          setWsBusy(false);
        }, 100);
      };
    }
  }, [status, wsReady]);

  // update display of song name
  useEffect(() => {
    if (!currentSongUrl) {
      setAudioLoading(false);
    }
    if (wsLogin) {
      const stitle = currentSongUrl
        .split("/music/")[1]
        .replace(/\.[^/.]+$/, "")
        .replace(/\.[^/.]+$/, "")
        .replace("/", " | ");
      //rap.audioEl.current.title = title;
      setCurrentSong(stitle);
      setTitle(stitle + " - TŠ TWIST MUSIC SYSTEM");
    }
  }, [currentSongUrl]);

  return (
    <main className="container">
      <Head>
        <title>{title}</title>
      </Head>
      {status !== "loading" ? (
        <>
          {!data?.user && status !== "authenticated" ? (
            <>
              <div className="text-center my-5">
                <Image src="/logo.png"></Image>
                <h1>TŠ TWIST MUSIC SYSTEM</h1>
              </div>
              <div className="text-center">
                <h2>Login with:</h2>
                <div className="my-3">
                  <FontAwesomeIcon
                    icon={faFacebook}
                    size="3x"
                    className="m-3"
                    onClick={() => {
                      signIn("facebook");
                    }}
                  ></FontAwesomeIcon>
                  <FontAwesomeIcon
                    icon={faGoogle}
                    size="3x"
                    className="m-3"
                    onClick={() => {
                      signIn("google");
                    }}
                  ></FontAwesomeIcon>
                </div>
              </div>
            </>
          ) : (
            <>
              {joined ? (
                <>
                  {controller ? null : (
                    <>
                      <ReactPlayer
                        ref={(element) => {
                          rap = element;
                        }}
                        url={currentSongUrl}
                        progressInterval={100}
                        stopOnUnmount={false}
                        playing={playerStatus == "playing" ? true : false}
                        controls={true}
                        playsinline={true}
                        muted={muted}
                        width="100%"
                        height="auto"
                        onReady={() => {
                          //setPlayerStatus("playing");
                        }}
                        onProgress={(e) => {
                          setMuted(false);
                          setAudioLoading(false);
                          if (wsLogin && !sliderInteraction) {
                            setTimestamp(e.playedSeconds);
                          }
                        }}
                        onPlay={() => {
                          if (
                            wsLogin &&
                            !sliderInteraction &&
                            !wsBusy &&
                            !afterSongUpdate
                          ) {
                            client?.send(
                              JSON.stringify({ type: typeDefinition.PLAY })
                            );
                          }
                        }}
                        onPause={() => {
                          if (
                            wsLogin &&
                            !sliderInteraction &&
                            !wsBusy &&
                            !audioLoading &&
                            !afterSongUpdate
                          ) {
                            client?.send(
                              JSON.stringify({ type: typeDefinition.PAUSE })
                            );
                          }
                        }}
                        onDuration={(e) => {
                          setMaxTimestamp(e);
                        }}
                        onBuffer={() => {
                          setAudioLoading(true);
                        }}
                        onBufferEnd={() => {
                          setAudioLoading(false);
                        }}
                        config={{
                          file: {
                            hlsOptions: {
                              debug: true,
                            },
                          },
                        }}
                        className="player"
                        style={{
                          display: "none",
                        }}
                      ></ReactPlayer>
                    </>
                  )}
                  {wsReady && wsLogin && songsLoaded ? (
                    <>
                      <div className="absolute-wrap">
                        <div className="text-center my-4 container">
                          <p>
                            {playerStatus == "idle"
                              ? "Select a song!"
                              : currentSong}
                          </p>
                          <h1>
                            {sliderInteraction
                              ? secondsToString(Math.floor(sliderValue))
                              : secondsToString(Math.floor(timestamp))}{" "}
                            / {secondsToString(Math.floor(maxTimestamp))}
                          </h1>
                          <Slider
                            max={maxTimestamp}
                            min={0}
                            defaultValue={0}
                            value={
                              sliderInteraction
                                ? sliderValue
                                : Math.floor(timestamp)
                            }
                            ariaLabelForHandle={`${timestamp}`}
                            ariaValueTextFormatterForHandle={(value) => {
                              return secondsToString(Math.floor(value));
                            }}
                            ariaLabelledByForHandle={`${timestamp}`}
                            included={true}
                            onBeforeChange={() => {
                              setSliderValue(timestamp);
                              client?.send(
                                JSON.stringify({
                                  type: typeDefinition.PAUSE,
                                })
                              );
                              setSliderInteraction(true);
                            }}
                            onAfterChange={async () => {
                              setSliderInteraction(false);
                              setTimeout(() => {
                                client?.send(
                                  JSON.stringify({
                                    type: typeDefinition.PLAY,
                                  })
                                );
                              }, 250);
                            }}
                            onChange={(value) => {
                              const sendData = async () => {
                                client?.send(
                                  JSON.stringify({
                                    type: typeDefinition.TIME_UPDATE,
                                    timestamp: value,
                                  })
                                );
                              };
                              setSliderValue(value as number);
                              setTimeout(sendData, 250);
                            }}
                            style={{ width: "80%", margin: "0 auto" }}
                          />
                          {playerStatus != "idle" ? (
                            <>
                              {" "}
                              <div className="m-2">
                                {previousSongs.length > 1 ? (
                                  <Button
                                    className="mx-1"
                                    onClick={() => {
                                      if (!wsBusy) {
                                      }
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faBackwardFast}
                                      size="2x"
                                    ></FontAwesomeIcon>
                                  </Button>
                                ) : null}
                                {playerStatus == "paused" ? (
                                  <Button
                                    className="mx-1"
                                    onClick={() => {
                                      if (!wsBusy)
                                        client?.send(
                                          JSON.stringify({
                                            type: typeDefinition.PLAY,
                                          })
                                        );
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faPlay}
                                      size="2x"
                                    ></FontAwesomeIcon>
                                  </Button>
                                ) : (
                                  <Button
                                    className="mx-1"
                                    onClick={() => {
                                      if (!wsBusy)
                                        client?.send(
                                          JSON.stringify({
                                            type: typeDefinition.PAUSE,
                                          })
                                        );
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faPause}
                                      size="2x"
                                    ></FontAwesomeIcon>
                                  </Button>
                                )}
                                <Button
                                  className="mx-1"
                                  onClick={() => {
                                    if (!wsBusy) {
                                      client?.send(
                                        JSON.stringify({
                                          type: typeDefinition.TIME_UPDATE,
                                          timestamp: maxTimestamp + 999999,
                                        })
                                      );
                                      client?.send(
                                        JSON.stringify({
                                          type: typeDefinition.PAUSE,
                                        })
                                      );
                                    }
                                  }}
                                >
                                  <FontAwesomeIcon
                                    icon={faForwardFast}
                                    size="2x"
                                  ></FontAwesomeIcon>
                                </Button>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-center login-container">
                        <p>
                          Logged in as {data?.user?.name}{" "}
                          <Button
                            onClick={() => {
                              signOut();
                            }}
                            size="sm"
                          >
                            Logout
                          </Button>
                        </p>
                        <p>
                          Session ID: {sessionId}{" "}
                          <FontAwesomeIcon
                            icon={faUser}
                            className="mx-1"
                          ></FontAwesomeIcon>
                          {activeUsers}{" "}
                          <Button
                            onClick={() => {
                              setJoined(false);
                              setWsReady(false);
                              setWsLogin(false);
                              client?.close();
                              setClient(undefined);
                              toast.success(`Left session ${sessionId}`, {
                                duration: 1000,
                              });
                              setSessionId("");
                            }}
                            size="sm"
                          >
                            Leave
                          </Button>
                        </p>
                      </div>
                      <Navbar expand="lg" style={{ position: "static" }}>
                        <Container>
                          <Navbar.Brand>Categories</Navbar.Brand>
                          <Navbar.Toggle />
                          <Navbar.Collapse className="justify-content-end">
                            <Nav className="mw-auto">
                              <CategoryButtons categories={categories} />
                            </Nav>
                          </Navbar.Collapse>
                        </Container>
                      </Navbar>
                      <Button
                        onClick={scrollToTop}
                        style={{
                          display: visible ? "inline" : "none",
                          position: "fixed",
                          bottom: "10px",
                          right: "10px",
                        }}
                      >
                        <FontAwesomeIcon icon={faArrowUp}></FontAwesomeIcon>
                      </Button>
                      <div className="text-center songlist">
                        <CategoryList
                          list={songList}
                          client={client}
                        ></CategoryList>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute-center">
                        <div className="text-center">
                          <div className="loader">Loading...</div>
                          {!wsReady && !wsLogin ? (
                            <p>Joining session {sessionId}...</p>
                          ) : (
                            <p>Logging in...</p>
                          )}
                          {!songsLoaded ? (
                            <p>Updating song listing...</p>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Modal
                    size="lg"
                    show={modalShow}
                    onHide={() => setModalShow(false)}
                    backdrop="static"
                    centered
                  >
                    <Modal.Header>
                      <Modal.Title>Join session {sessionId}?</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <p>
                        You were invited to join session {sessionId}. Do you
                        wanna join?
                      </p>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button
                        onClick={() => {
                          setModalShow(false);
                          setJoined(true);
                          setController(true);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Join as Controller
                      </Button>
                      <Button
                        onClick={() => {
                          setModalShow(false);
                          setJoined(true);
                          setController(false);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Join as Player
                      </Button>
                      <Button
                        onClick={() => {
                          setModalShow(false);
                        }}
                      >
                        Start different session
                      </Button>
                    </Modal.Footer>
                  </Modal>
                  <Modal
                    size="sm"
                    show={showError}
                    onHide={() => setShowError(false)}
                    backdrop="static"
                    centered
                  >
                    <Modal.Header>
                      <Modal.Title>Connection lost.</Modal.Title>
                    </Modal.Header>
                    <Modal.Footer>
                      <Button
                        onClick={() => {
                          setShowError(false);
                          setJoined(true);
                        }}
                      >
                        Reconnect
                      </Button>
                      <Button
                        onClick={() => {
                          setSessionId("");
                          setShowError(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </Modal.Footer>
                  </Modal>
                  <div className="text-center my-5 container">
                    <h1>Welcome back {data?.user?.name}!</h1>
                    <div className="text-center my-3">
                      <Button
                        className="mx-1"
                        onClick={() => {
                          setSessionId(getUniqueID);
                          setController(false);
                          setJoined(true);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Create Session & Join as Player
                      </Button>
                      <Button
                        className="mx-1"
                        onClick={() => {
                          setSessionId(getUniqueID);
                          setController(true);
                          setJoined(true);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Create Session & Join as Controller
                      </Button>{" "}
                    </div>
                    <div className="text-center my-3">
                      <Form.Control
                        type="text"
                        placeholder="Session ID"
                        className="my-2"
                        value={sessionId}
                        onChange={(e) => {
                          setSessionId(e.target.value);
                        }}
                      />{" "}
                      <Button
                        className="mx-1"
                        onClick={() => {
                          if (!sessionId.length) {
                            toast.error("Session ID cannot be empty!", {
                              duration: 1000,
                            });
                            return;
                          }
                          setController(false);
                          setJoined(true);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Join Session as Player
                      </Button>
                      <Button
                        className="mx-1"
                        onClick={() => {
                          if (!sessionId.length) {
                            toast.error("Session ID cannot be empty!", {
                              duration: 1000,
                            });
                            return;
                          }
                          setController(true);
                          setJoined(true);
                          router.push({ pathname: "/", query: {} }, undefined, {
                            shallow: true,
                          });
                        }}
                      >
                        Join Session as Controller
                      </Button>
                    </div>
                    <p>
                      Logged in as {data?.user?.name}{" "}
                      <Button
                        onClick={() => {
                          signOut();
                        }}
                        size="sm"
                      >
                        Logout
                      </Button>
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="absolute-center">
            <div className="text-center">
              <div className="loader">Loading...</div>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default Home;

function secondsToString(seconds: number) {
  var numyears = Math.floor(seconds / 31536000);
  var numdays = Math.floor((seconds % 31536000) / 86400);
  var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
  var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
  var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;

  if (isNaN(numminutes) || isNaN(numseconds)) {
    return "-:--";
  }

  const final =
    (numyears ? numyears + ":" : "") +
    (numdays ? numdays + ":" : "") +
    (numhours ? numhours + ":" : "") +
    numminutes +
    ":" +
    (numseconds < 10 ? `0${numseconds}` : numseconds);

  return final;
}

function CategoryList({ list, client }: any) {
  return list
    ? list.map((l: any) => {
        return (
          <div key={l.name}>
            <span className="anchor" id={l.name}></span>
            <Table striped bordered hover>
              <thead style={{ background: "black", color: "white" }}>
                <tr>
                  <th>{l.name}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <SongList list={l.files} client={client} category={l.name} />
              </tbody>
            </Table>
          </div>
        );
      })
    : null;
}

function SongList({ list, client, category }: any) {
  return list
    ? list.map((l: any) => (
        <Song file={l} client={client} category={category} key={l}></Song>
      ))
    : null;
}

function Song({ file, client, category }: any) {
  return (
    <>
      <tr>
        <td>
          <p className="text-start song-name">
            {file.replace(/\.[^/.]+$/, "").replace(/\.[^/.]+$/, "")}
          </p>
        </td>
        <td>
          <FontAwesomeIcon
            icon={faPlay}
            size="2x"
            onClick={() => {
              client.send(
                JSON.stringify({
                  type: "song_update",
                  songUrl: remoteMusicLoc + "/" + category + "/" + file,
                  fileName: file,
                  category: category,
                })
              );
            }}
          ></FontAwesomeIcon>
        </td>
      </tr>
    </>
  );
}

function CategoryButtons({ categories }: any) {
  return categories
    ? categories.map((c: any) => <CategoryButton name={c} key={c} />)
    : null;
}

function CategoryButton({ name }: any) {
  return (
    <>
      <Nav.Link href={`#${name}`}>{name}</Nav.Link>
    </>
  );
}
