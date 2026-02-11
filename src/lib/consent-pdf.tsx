import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8, borderBottom: "1 solid #ccc", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { fontWeight: "bold", width: 140 },
  value: { flex: 1 },
  checkbox: { marginBottom: 4 },
  signatureImage: { width: 200, height: 80, marginTop: 8 },
  footer: { marginTop: 20, paddingTop: 8, borderTop: "1 solid #ccc", fontSize: 8, color: "#999", textAlign: "center" },
});

type ConsentFormPDFProps = {
  consentForm: {
    id: string;
    bookingId: string;
    fullLegalName: string;
    dateOfBirth: Date;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    skinConditions: string | null;
    allergies: string | null;
    medications: string | null;
    bloodDisorders: boolean;
    isPregnant: boolean;
    recentSubstances: boolean;
    risksAcknowledged: boolean;
    aftercareAgreed: boolean;
    photoReleaseAgreed: boolean;
    signatureDataUrl: string;
    signedAt: Date;
    createdAt: Date;
    user: { name: string; email: string };
    booking: { appointmentDate: Date | null; placement: string; size: string };
  };
};

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ConsentFormPDF({ consentForm }: ConsentFormPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Studio Saturn - Tattoo Consent Form</Text>
          <Text style={styles.subtitle}>
            Booking Reference: {consentForm.bookingId}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Legal Name:</Text>
            <Text style={styles.value}>{consentForm.fullLegalName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(consentForm.dateOfBirth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{consentForm.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{consentForm.user.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Emergency Contact:</Text>
            <Text style={styles.value}>{consentForm.emergencyContact}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Emergency Phone:</Text>
            <Text style={styles.value}>{consentForm.emergencyPhone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Appointment Date:</Text>
            <Text style={styles.value}>{formatDate(consentForm.booking.appointmentDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Placement:</Text>
            <Text style={styles.value}>{consentForm.booking.placement}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Size:</Text>
            <Text style={styles.value}>{consentForm.booking.size}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical History</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Skin Conditions:</Text>
            <Text style={styles.value}>{consentForm.skinConditions || "None reported"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Allergies:</Text>
            <Text style={styles.value}>{consentForm.allergies || "None reported"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Medications:</Text>
            <Text style={styles.value}>{consentForm.medications || "None reported"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Blood Disorders:</Text>
            <Text style={styles.value}>{consentForm.bloodDisorders ? "Yes" : "No"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pregnant:</Text>
            <Text style={styles.value}>{consentForm.isPregnant ? "Yes" : "No"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Recent Substances:</Text>
            <Text style={styles.value}>{consentForm.recentSubstances ? "Yes" : "No"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledgments</Text>
          <Text style={styles.checkbox}>
            {consentForm.risksAcknowledged ? "[X]" : "[ ]"} I acknowledge the risks associated with getting a tattoo
          </Text>
          <Text style={styles.checkbox}>
            {consentForm.aftercareAgreed ? "[X]" : "[ ]"} I agree to follow all aftercare instructions
          </Text>
          <Text style={styles.checkbox}>
            {consentForm.photoReleaseAgreed ? "[X]" : "[ ]"} I consent to photos being used for portfolio purposes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature</Text>
          {consentForm.signatureDataUrl && (
            <Image src={consentForm.signatureDataUrl} style={styles.signatureImage} />
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Signed:</Text>
            <Text style={styles.value}>{formatDate(consentForm.signedAt)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            This document was digitally signed on {formatDate(consentForm.signedAt)}.
            Form ID: {consentForm.id}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
