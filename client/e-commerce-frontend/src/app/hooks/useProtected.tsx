

import { useRouter } from 'next/router';
import { useEffect } from 'react';
import userAuth from './userAuth';

interface ProtectedProps {
    children: React.ReactNode;
}

export default function Protected({children}: ProtectedProps ){
    const isAuthenticated = userAuth();
    const router = useRouter();


    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    return isAuthenticated ? children : null; 
}

   