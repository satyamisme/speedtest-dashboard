"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SpeedTest from "./SpeedTest";
import { Loader2 } from "lucide-react";
import { fetchCompanies } from "@/data/isp";
import React, { useState, useEffect } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase";

type FormData = {
  isp: string;
  advertised: number;
  download: number;
  upload: number;
  lat: number | null;
  lng: number | null;
  note?: string;
};

interface ServerLocation {
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
}

function Form({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [serverLocation, setServerLocation] = useState<ServerLocation | null>(
    null
  );
  const [userISP, setUserISP] = useState<string>("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [ispInputText, setISPInputText] = useState("Detecting ISP...");

  useEffect(() => {
    setTimeout(() => {
      setISPInputText("Select ISP");
    }, 5000);
  });

  const [formData, setFormData] = useState<FormData>({
    isp: "",
    advertised: 0,
    download: downloadSpeed,
    upload: uploadSpeed,
    lat: null,
    lng: null,
  });

  useEffect(() => {
    fetchCompanies().then((companies) => setCompanies(companies));
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prevData) => ({
            ...prevData,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
          setLoading(false);
        },
        (err) => {
          setError("Error getting location: " + err.message);
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  useEffect(() => {
    const updateISP = async () => {
      if (userISP) {
        const currentCompanies = await fetchCompanies();

        if (!currentCompanies.includes(userISP)) {
          try {
            const companiesCollection = collection(db, "companies");
            await addDoc(companiesCollection, { name: userISP });
            setCompanies((prevCompanies) => [...prevCompanies, userISP]);
          } catch (error) {
            console.error("Error adding new ISP to Firestore:", error);
          }
        }

        setFormData((prevData) => ({
          ...prevData,
          isp: userISP,
        }));
      }
    };

    updateISP();
  }, [userISP]);

  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      download: downloadSpeed,
      upload: uploadSpeed,
    }));
  }, [downloadSpeed, uploadSpeed]);

  const handleISPChange = async (value: string) => {
    console.log(`handleISPChange triggered with value: ${value}`);
    if (!companies.includes(value)) {
      try {
        // Add the new ISP to Firestore if it's not already in the list
        const companiesCollection = collection(db, "companies");
        await addDoc(companiesCollection, { name: value });

        // Update the local state to reflect the new company added
        setCompanies((prevCompanies) => [...prevCompanies, value]);

        setFormData((prevData) => ({
          ...prevData,
          isp: value,
        }));

        console.log(`Added new ISP: ${value} to Firestore`);
      } catch (error) {
        console.error("Error adding new ISP to Firestore:", error);
      }
    } else {
      console.log(`ISP: ${value} already exists in Firestore`);
      setFormData((prevData) => ({
        ...prevData,
        isp: value,
      }));
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.name;
    const value = event.target.value;
    setFormData((values) => ({ ...values, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.lat === null || formData.lng === null) {
      setError("Location data is not available. Please try again.");
      return;
    }
    try {
      setLoading(true);
      const speedPointsCollection = collection(db, "speedPoints");
      await addDoc(speedPointsCollection, formData);
      setFormData({
        isp: "",
        advertised: 0,
        download: 0,
        upload: 0,
        lat: null,
        lng: null,
      });
      setSuccess("Speed point added successfully!");
      setTimeout(() => {
        onSuccess();
      }, 2000); // Close the dialog after 2 seconds
    } catch (error) {
      console.error("Error adding speed point:", error);
      setError("Failed to add speed point. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 py-4">
        <Select value={formData.isp} onValueChange={handleISPChange}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder={ispInputText} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {companies.map((isp) => (
                <SelectItem key={isp} value={isp}>
                  {isp}
                </SelectItem>
              ))}
              {userISP && !companies.includes(userISP) && (
                <SelectItem key="custom" value={userISP}>
                  {userISP}
                </SelectItem>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          type="number"
          name="advertised"
          value={formData.advertised || ""}
          onChange={handleChange}
          required
          placeholder="Advertised Package Speed in Mbps"
          className="col-span-3"
        />
        <div className="flex flex-row gap-2">
          <Input
            type="number"
            name="download"
            value={downloadSpeed || ""}
            onChange={handleChange}
            required
            placeholder="Download Speed"
            disabled
          />
          <Input
            type="number"
            name="upload"
            value={uploadSpeed || ""}
            onChange={handleChange}
            required
            placeholder="Upload Speed"
            disabled
          />
          <SpeedTest
            setDownload={setDownloadSpeed}
            setUpload={setUploadSpeed}
            setServer={setServerLocation}
            setUserISP={setUserISP}
          />
        </div>
        <Textarea
          name="note"
          maxLength={240}
          value={formData.note || ""}
          onChange={handleNoteChange}
          required
          placeholder="What do you like about your ISP?"
          className="col-span-3"
        />
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-500">{success}</div>}
        <Button
          type="submit"
          disabled={
            formData.lat === null ||
            formData.lng === null ||
            loading ||
            error !== null ||
            formData.isp === "" ||
            formData.advertised === 0 ||
            uploadSpeed === 0 ||
            downloadSpeed === 0
          }
          variant="ghost"
          className="bg-gray-900 hover:bg-gray-800 text-slate-200 hover:text-slate-200 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse">Adding</span>
            </>
          ) : (
            "Add speed point"
          )}
        </Button>

        <div className="text-gray-300 text-sm">
          <p>
            <span className="font-semibold">User location</span> Latitude{" "}
            {formData.lat !== null ? formData.lat.toFixed(6) : "Not available"};
            Longitude{" "}
            {formData.lng !== null ? formData.lng.toFixed(6) : "Not available"}
            {serverLocation && (
              <>
                <span className="font-semibold">
                  {" "}
                  Speed Test Server Location
                </span>{" "}
                {serverLocation.city}, {serverLocation.region},{" "}
                {serverLocation.country}
                <span className="font-semibold"> ISP</span> {serverLocation.isp}
                <span className="font-semibold"> Coordinates</span>{" "}
                {serverLocation.lat.toFixed(4)}, {serverLocation.lon.toFixed(4)}
                .
              </>
            )}
          </p>
        </div>
      </div>
    </form>
  );
}

export function TestForm({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="font-semibold animate-shimmer items-center justify-center rounded-lg border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 text-slate-300 transition-colors focus:outline-none focus:ring-2  hover:text-white  duration-300"
        >
          Report your speed
        </Button>
      </DialogTrigger>
      <DialogContent className=" bg-white rounded-md">
        <DialogHeader>
          <DialogTitle>Add your speed to the database</DialogTitle>
          <DialogDescription>
            Help your local community pick the best ISP in your area
          </DialogDescription>
        </DialogHeader>
        <Form onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
