import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {  useState } from "react";
import Home          from './components/Home.jsx';
import AccessRequest from './components/AccessRequest.jsx';
import Chatbot       from './components/Chatbot.jsx';
import MapConnect    from './components/MapConnect.jsx';
import LoadingScreen from './components/Animations/LoadingScreen.jsx';
import CrimeDataEntry from './components/CrimeDataEntry.jsx';
import AgentNetwork   from './components/AgentNetwork.jsx';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  return (
     <>
     {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}
      {loaded && (
    <Router>
      <Routes>
        <Route path="/"       element={<Home/>}          />
        <Route path="/access" element={<AccessRequest />} />
        <Route path="/chat"   element={<Chatbot />}       />
        <Route path="/map"    element={<MapConnect />}    />
        <Route path="/submit-crime" element={<CrimeDataEntry />} />
        <Route path="/agents" element={<AgentNetwork />}  />
      </Routes>
    </Router>
      )}
      </>
  );
}

