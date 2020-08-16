package org.opencds.cqf.r4.helpers;

import java.util.ArrayList;
import java.util.List;

import org.apache.poi.openxml4j.exceptions.InvalidOperationException;
import org.cqframework.cql.cql2elm.LibraryManager;
import org.cqframework.cql.cql2elm.ModelManager;
import org.cqframework.cql.elm.execution.Library;
import org.cqframework.cql.elm.execution.VersionedIdentifier;
import org.hl7.fhir.r4.model.*;
import org.opencds.cqf.common.evaluation.LibraryLoader;
import org.opencds.cqf.common.providers.LibraryResolutionProvider;
import org.opencds.cqf.common.providers.LibrarySourceProvider;

/**
 * Created by Christopher on 1/11/2017.
 */
public class LibraryHelper {

    public static LibraryLoader createLibraryLoader(LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> provider) {
        ModelManager modelManager = new ModelManager();
        LibraryManager libraryManager = new LibraryManager(modelManager);
        libraryManager.getLibrarySourceLoader().clearProviders();

        libraryManager.getLibrarySourceLoader().registerProvider(
                new LibrarySourceProvider<org.hl7.fhir.r4.model.Library, org.hl7.fhir.r4.model.Attachment>(provider,
                        x -> x.getContent(), x -> x.getContentType(), x -> x.getData()));

        return new LibraryLoader(libraryManager, modelManager);
    }

    public static List<org.cqframework.cql.elm.execution.Library> loadLibraries(Measure measure,
            org.opencds.cqf.cql.engine.execution.LibraryLoader libraryLoader,
            LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> libraryResourceProvider) {
        List<org.cqframework.cql.elm.execution.Library> libraries = new ArrayList<org.cqframework.cql.elm.execution.Library>();

        // load libraries
        for (CanonicalType ref : measure.getLibrary()) {
            // if library is contained in measure, load it into server
            String id = CanonicalHelper.getId(ref);
            if (id.startsWith("#")) {
                id = id.substring(1);
                for (Resource resource : measure.getContained()) {
                    if (resource instanceof org.hl7.fhir.r4.model.Library
                            && resource.getIdElement().getIdPart().equals(id)) {
                        libraryResourceProvider.update((org.hl7.fhir.r4.model.Library) resource);
                    }
                }
            }

            // We just loaded it into the server so we can access it by Id
            org.hl7.fhir.r4.model.Library library = libraryResourceProvider.resolveLibraryById(id);
            if (library != null && isLogicLibrary(library)) {
                libraries.add(
                        libraryLoader.load(new VersionedIdentifier().withId(library.getName()).withVersion(library.getVersion()))
                );
            }
        }

        VersionedIdentifier primaryLibraryId = libraries.get(0).getIdentifier();
        org.hl7.fhir.r4.model.Library primaryLibrary = libraryResourceProvider.resolveLibraryByName(primaryLibraryId.getId(), primaryLibraryId.getVersion());
        for (RelatedArtifact artifact : primaryLibrary.getRelatedArtifact()) {
            if (artifact.hasType() && artifact.getType().equals(RelatedArtifact.RelatedArtifactType.DEPENDSON) && artifact.hasResource()) {
                org.hl7.fhir.r4.model.Library library = null;
                // Raw references to Library/libraryId or libraryId
                if (artifact.getResource().startsWith("Library/") || ! artifact.getResource().contains("/")) {
                    library = libraryResourceProvider.resolveLibraryById(artifact.getResource().replace("Library/", ""));
                }
                // Full url (e.g. http://hl7.org/fhir/us/Library/FHIRHelpers)
                else if (artifact.getResource().contains(("/Library/"))) {
                    library = libraryResourceProvider.resolveLibraryByCanonicalUrl(artifact.getResource());
                }

                if (library != null && isLogicLibrary(library)) {
                    libraries.add(
                            libraryLoader.load(new VersionedIdentifier().withId(library.getName()).withVersion(library.getVersion()))
                    );
                }
            }
        }

        if (libraries.isEmpty()) {
            throw new IllegalArgumentException(String
                    .format("Could not load library source for libraries referenced in Measure/%s.", measure.getId()));
        }

        return libraries;
    }

    private static boolean isLogicLibrary(org.hl7.fhir.r4.model.Library library) {
        if (library == null) {
            return false;
        }

        if (!library.hasType()) {
            return false;
        }

        if (!library.getType().hasCoding()) {
            return false;
        }

        for (Coding c : library.getType().getCoding()) {
            if (c.hasSystem() && c.getSystem().equals("http://terminology.hl7.org/CodeSystem/library-type")
                    && c.hasCode() && c.getCode().equals("logic-library")) {
                return true;
            }
        }

        return false;
    }

    public static Library resolveLibraryById(String libraryId,
            org.opencds.cqf.cql.engine.execution.LibraryLoader libraryLoader,
            LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> libraryResourceProvider) {
        // Library library = null;

        org.hl7.fhir.r4.model.Library fhirLibrary = libraryResourceProvider.resolveLibraryById(libraryId);
        return libraryLoader
                .load(new VersionedIdentifier().withId(fhirLibrary.getName()).withVersion(fhirLibrary.getVersion()));

        // for (Library l : libraryLoader.getLibraries()) {
        // VersionedIdentifier vid = l.getIdentifier();
        // if (vid.getId().equals(fhirLibrary.getName()) &&
        // LibraryResourceHelper.compareVersions(fhirLibrary.getVersion(),
        // vid.getVersion()) == 0) {
        // library = l;
        // break;
        // }
        // }

        // if (library == null) {

        // }

        // return library;
    }

    public static Library resolvePrimaryLibrary(Measure measure,
            org.opencds.cqf.cql.engine.execution.LibraryLoader libraryLoader,
            LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> libraryResourceProvider) {
        // default is the first library reference
        String id = CanonicalHelper.getId(measure.getLibrary().get(0));

        Library library = resolveLibraryById(id, libraryLoader, libraryResourceProvider);

        if (library == null) {
            throw new IllegalArgumentException(String.format("Could not resolve primary library for Measure/%s.",
                    measure.getIdElement().getIdPart()));
        }

        return library;
    }

    public static Library resolvePrimaryLibrary(PlanDefinition planDefinition,
            org.opencds.cqf.cql.engine.execution.LibraryLoader libraryLoader,
            LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> libraryResourceProvider) {
        String id = CanonicalHelper.getId(planDefinition.getLibrary().get(0));

        Library library = resolveLibraryById(id, libraryLoader, libraryResourceProvider);

        if (library == null) {
            throw new IllegalArgumentException(String.format("Could not resolve primary library for PlanDefinition/%s",
                    planDefinition.getIdElement().getIdPart()));
        }

        return library;
    }
}
