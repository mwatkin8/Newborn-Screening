library MaternalFactors version '1.0.000'

using FHIR version '4.0.0'

include FHIRHelpers version '4.0.0' called FHIRHelpers

codesystem "LOINC": 'http://loinc.org'

valueset "HELLP Set": 'http://test-url.com/fhir/ValueSet/hellp'
valueset "Pregnancy Fatty Liver Set": 'http://test-url.com/fhir/ValueSet/pregnancy-fatty-liver'
valueset "PRBC Transfusion Set": 'http://test-url.com/fhir/ValueSet/prbc-transfusion'
valueset "Steroid Treatment Set": 'http://test-url.com/fhir/ValueSet/steroid-treatment'
valueset "Thyroid Treatments Set": 'http://test-url.com/fhir/ValueSet/thyroid-treatments'
valueset "TPN Set": 'http://test-url.com/fhir/ValueSet/tpn'
valueset "Immunosuppressive Therapy Set": 'http://test-url.com/fhir/ValueSet/immunosuppressive-therapy'

code "Maternal Factors Narrative Code": '67707-0' from "LOINC"

context Patient

define "HELLP syndrome":
    [Condition: "HELLP Set"] C
    return C.id.value

define "Fatty liver of pregnancy":
    [Condition: "Pregnancy Fatty Liver Set"] C
    return C.id.value

define "Packed red blood cell (PRBC) transfusion":
    [Procedure: "PRBC Transfusion Set"] P
    return P.id.value

define "Steroid treatment":
    [MedicationRequest: "Steroid Treatment Set"] M
    return M.id.value

define "Thyroid treatment (including propylthiouracil (PTU), methimazole (Tapazole), or past treatment with radioactive iodine (I-131))":
    [MedicationRequest: "Thyroid Treatments Set"] M
    return M.id.value

define "TPN":
    [Observation: "TPN Set"] O
    return O.id.value

//For InfantFactors Library - "or mother"
define "Immunosuppressive therapy of baby or mother":
    [Procedure: "Immunosuppressive Therapy Set"] P
    return P.id.value

define "The narrative for infant factors that could impact NBS interpretation.":
    [Observation: "Maternal Factors Narrative Code"] O
    return {
        "ID": O.id,
        "Narrative": O.value
     }
