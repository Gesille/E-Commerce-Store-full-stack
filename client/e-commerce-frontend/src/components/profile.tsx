/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */


import React, { FC ,useState,useEffect} from 'react' ;

import { useSelector} from 'react-redux';
import { useSession } from "next-auth/react";

import toast from 'react-hot-toast'
import { IoMdPerson } from 'react-icons/io';
import Link from 'next/link';
import Image from 'next/image';
import avatar from "../public/assests/avatar1.jpg";
import { useSocialAuthMutation } from '@/redux/auth/authApi';
import Protected from '../app/hooks/useProtected';
import ProfilePage from '../app/profile/page';

type Props = {

};

const Page: FC<Props> = (props) => {
  const customMenus = [
    { name: "Courses", href: "/courselist" },
    { name: "About Us", href: "/about" },
    { name: "FAQ", href: "/faqcourse" },
    { name: "Policy", href: "/policy" },

  ];
  
    const [open,setOpen] = useState(false);
    const [activeItem,setActiveItem] = useState(5);

    const [route,setRoute] = useState("Login");
    const {user} = useSelector((state:any) => state.auth)
    
    const [socialAuth, { isSuccess, error }] = useSocialAuthMutation();
  const { data } = useSession();
  useEffect(() => {
    if (!user) {
      if (data) {
        socialAuth({
          email: data?.user?.email,
          name: data?.user?.name,
          avatar: data?.user?.image,
        });
      }
    }
    
    if(data === null ){
      if(isSuccess){
      toast.success("Login Successfully!")
      }
    }
    
  }, [data, user]);


    


    return (
        <div className='min-h-screen'>
            <Protected>
               
                <ProfilePage />
            </Protected>
            {user ? (
           
             
             
              <Image
                src={user.avatar ? user.avatar.url : avatar}
                alt=""
                width={30}
                height={30}
                className="w-[30px] h-[30px] rounded-full cursor-pointer"
                style={{border: activeItem === 5 ? "2px solid #37a39a" : "none"}}
              />
            
          ) : (
            <IoMdPerson className=" text-lg" onClick={() => setOpen(true)} />
          )}
            

        </div>
    )
}

export default Page;