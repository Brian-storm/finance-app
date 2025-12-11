import React, { useEffect } from 'react';

function Home() {

    useEffect(() => {
        console.log("running...at Home");
        
    }, []);


    return (
        <div className="container mt-4">
            <h2>Home Page</h2>
            
        </div>
    );
}

export default Home;