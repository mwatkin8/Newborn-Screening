package org.opencds.cqf.r4.providers;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;
import org.cqframework.cql.cql2elm.CqlTranslator;
import org.cqframework.cql.cql2elm.CqlTranslatorException;
import org.cqframework.cql.cql2elm.LibraryManager;
import org.cqframework.cql.cql2elm.ModelManager;
import org.cqframework.cql.elm.execution.VersionedIdentifier;
import org.cqframework.cql.elm.tracking.TrackBack;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.Bundle;
import org.hl7.fhir.r4.model.Endpoint;
import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.r4.model.Library;
import org.hl7.fhir.r4.model.Narrative;
import org.hl7.fhir.r4.model.Parameters;
import org.hl7.fhir.r4.model.Resource;
import org.hl7.fhir.r4.model.StringType;
import org.opencds.cqf.cds.providers.PriorityRetrieveProvider;
import org.opencds.cqf.common.evaluation.LibraryLoader;
import org.opencds.cqf.common.helpers.ClientHelperDos;
import org.opencds.cqf.common.helpers.DateHelper;
import org.opencds.cqf.common.helpers.TranslatorHelper;
import org.opencds.cqf.common.helpers.UsingHelper;
import org.opencds.cqf.common.providers.LibraryResolutionProvider;
import org.opencds.cqf.common.providers.LibrarySourceProvider;
import org.opencds.cqf.common.providers.R4ApelonFhirTerminologyProvider;
import org.opencds.cqf.common.retrieve.JpaFhirRetrieveProvider;
import org.opencds.cqf.cql.engine.data.DataProvider;
import org.opencds.cqf.cql.engine.data.CompositeDataProvider;
import org.opencds.cqf.cql.engine.execution.Context;
import org.opencds.cqf.cql.engine.execution.CqlEngine;
import org.opencds.cqf.cql.engine.execution.EvaluationResult;
import org.opencds.cqf.cql.engine.fhir.model.FhirModelResolver;
import org.opencds.cqf.cql.engine.fhir.model.R4FhirModelResolver;
import org.opencds.cqf.cql.engine.fhir.retrieve.RestFhirRetrieveProvider;
import org.opencds.cqf.cql.engine.fhir.searchparam.SearchParameterResolver;
import org.opencds.cqf.cql.engine.fhir.terminology.R4FhirTerminologyProvider;
import org.opencds.cqf.cql.engine.retrieve.RetrieveProvider;
import org.opencds.cqf.cql.engine.runtime.DateTime;
import org.opencds.cqf.cql.engine.runtime.Interval;
import org.opencds.cqf.cql.engine.terminology.TerminologyProvider;
import org.opencds.cqf.cql.evaluator.execution.provider.BundleRetrieveProvider;
import org.opencds.cqf.library.r4.NarrativeProvider;
import org.opencds.cqf.r4.helpers.FhirMeasureBundler;
import org.opencds.cqf.r4.helpers.LibraryHelper;

import ca.uhn.fhir.jpa.dao.DaoRegistry;
import ca.uhn.fhir.jpa.rp.r4.LibraryResourceProvider;
import ca.uhn.fhir.jpa.searchparam.SearchParameterMap;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.Operation;
import ca.uhn.fhir.rest.annotation.OperationParam;
import ca.uhn.fhir.rest.api.MethodOutcome;
import ca.uhn.fhir.rest.api.RestOperationTypeEnum;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.client.api.IGenericClient;
import ca.uhn.fhir.rest.param.StringParam;
import ca.uhn.fhir.rest.param.TokenParam;
import ca.uhn.fhir.rest.param.UriParam;

public class LibraryOperationsProvider implements LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> {

    private NarrativeProvider narrativeProvider;
    private DataRequirementsProvider dataRequirementsProvider;
    private LibraryResourceProvider libraryResourceProvider;
    DaoRegistry registry;
    TerminologyProvider defaultTerminologyProvider;

    public LibraryOperationsProvider(LibraryResourceProvider libraryResourceProvider,
            NarrativeProvider narrativeProvider, DaoRegistry registry, TerminologyProvider defaultTerminologyProvider) {
        this.narrativeProvider = narrativeProvider;
        this.dataRequirementsProvider = new DataRequirementsProvider();
        this.libraryResourceProvider = libraryResourceProvider;
        this.registry = registry;
        this.defaultTerminologyProvider = defaultTerminologyProvider;
    }

    private ModelManager getModelManager() {
        return new ModelManager();
    }

    private LibraryManager getLibraryManager(ModelManager modelManager) {
        LibraryManager libraryManager = new LibraryManager(modelManager);
        libraryManager.getLibrarySourceLoader().clearProviders();
        libraryManager.getLibrarySourceLoader().registerProvider(getLibrarySourceProvider());

        return libraryManager;
    }

    private LibrarySourceProvider<org.hl7.fhir.r4.model.Library, org.hl7.fhir.r4.model.Attachment> librarySourceProvider;

    private LibrarySourceProvider<org.hl7.fhir.r4.model.Library, org.hl7.fhir.r4.model.Attachment> getLibrarySourceProvider() {
        if (librarySourceProvider == null) {
            librarySourceProvider = new LibrarySourceProvider<org.hl7.fhir.r4.model.Library, org.hl7.fhir.r4.model.Attachment>(
                    getLibraryResourceProvider(), x -> x.getContent(), x -> x.getContentType(), x -> x.getData());
        }
        return librarySourceProvider;
    }

    private LibraryResolutionProvider<org.hl7.fhir.r4.model.Library> getLibraryResourceProvider() {
        return this;
    }

    @Operation(name = "$refresh-generated-content", type = Library.class)
    public MethodOutcome refreshGeneratedContent(HttpServletRequest theRequest, RequestDetails theRequestDetails,
            @IdParam IdType theId) {
        Library theResource = this.libraryResourceProvider.getDao().read(theId);
        // this.formatCql(theResource);

        ModelManager modelManager = this.getModelManager();
        LibraryManager libraryManager = this.getLibraryManager(modelManager);

        CqlTranslator translator = this.dataRequirementsProvider.getTranslator(theResource, libraryManager,
                modelManager);
        if (translator.getErrors().size() > 0) {
            throw new RuntimeException("Errors during library compilation.");
        }

        this.dataRequirementsProvider.ensureElm(theResource, translator);
        this.dataRequirementsProvider.ensureRelatedArtifacts(theResource, translator, this);
        this.dataRequirementsProvider.ensureDataRequirements(theResource, translator);

        try {
            Narrative n = this.narrativeProvider.getNarrative(this.libraryResourceProvider.getContext(), theResource);
            theResource.setText(n);
        } catch (Exception e) {
            // Ignore the exception so the resource still gets updated
        }

        return this.libraryResourceProvider.update(theRequest, theResource, theId,
                theRequestDetails.getConditionalUrl(RestOperationTypeEnum.UPDATE), theRequestDetails);
    }

    @Operation(name = "$get-elm", idempotent = true, type = Library.class)
    public Parameters getElm(@IdParam IdType theId, @OperationParam(name = "format") String format) {
        Library theResource = this.libraryResourceProvider.getDao().read(theId);
        // this.formatCql(theResource);

        ModelManager modelManager = this.getModelManager();
        LibraryManager libraryManager = this.getLibraryManager(modelManager);

        String elm = "";
        CqlTranslator translator = this.dataRequirementsProvider.getTranslator(theResource, libraryManager,
                modelManager);
        if (translator != null) {
            if (format.equals("json")) {
                elm = translator.toJson();
            } else {
                elm = translator.toXml();
            }
        }
        Parameters p = new Parameters();
        p.addParameter().setValue(new StringType(elm));
        return p;
    }

    @Operation(name = "$get-narrative", idempotent = true, type = Library.class)
    public Parameters getNarrative(@IdParam IdType theId) {
        Library theResource = this.libraryResourceProvider.getDao().read(theId);
        Narrative n = this.narrativeProvider.getNarrative(this.libraryResourceProvider.getContext(), theResource);
        Parameters p = new Parameters();
        p.addParameter().setValue(new StringType(n.getDivAsString()));
        return p;
    }

    // NOTICE: This is trash code that needs to be removed. Don't fix this. It's for
    // a one-off
    @Operation(name = "$evaluate", idempotent = true, type = Library.class)
    public Bundle evaluate(@IdParam IdType theId, @OperationParam(name = "patientId") String patientId,
            @OperationParam(name = "periodStart") String periodStart,
            @OperationParam(name = "periodEnd") String periodEnd,
            @OperationParam(name = "productLine") String productLine,
            @OperationParam(name = "terminologyEndpoint") Endpoint terminologyEndpoint,
            @OperationParam(name = "dataEndpoint") Endpoint dataEndpoint,
            @OperationParam(name = "context") String contextParam,
            @OperationParam(name = "executionResults") String executionResults,
            @OperationParam(name = "parameters") Parameters parameters,
            @OperationParam(name = "additionalData") Bundle additionalData) {

        if (patientId == null && contextParam != null && contextParam.equals("Patient")) {
            throw new IllegalArgumentException("Must specify a patientId when executing in Patient context.");
        }

        Library theResource = this.libraryResourceProvider.getDao().read(theId);

        VersionedIdentifier libraryIdentifier = new VersionedIdentifier().withId(theResource.getName())
                .withVersion(theResource.getVersion());

        FhirModelResolver resolver = new R4FhirModelResolver();
        TerminologyProvider terminologyProvider;

        if (terminologyEndpoint != null) {
            IGenericClient client = ClientHelperDos.getClient(resolver.getFhirContext(), terminologyEndpoint);
            if (terminologyEndpoint.getAddress().contains("apelon")) {
                terminologyProvider = new R4ApelonFhirTerminologyProvider(client);
            } else {
                terminologyProvider = new R4FhirTerminologyProvider(client);
            }
        } else {
            terminologyProvider = this.defaultTerminologyProvider;
        }
        
        DataProvider dataProvider;
        if (dataEndpoint != null) {
            IGenericClient client = ClientHelperDos.getClient(resolver.getFhirContext(), dataEndpoint);
            RestFhirRetrieveProvider retriever = new RestFhirRetrieveProvider(new SearchParameterResolver(resolver.getFhirContext()), client);
            retriever.setTerminologyProvider(terminologyProvider);
            if (terminologyEndpoint == null ||(terminologyEndpoint != null && !terminologyEndpoint.getAddress().equals(dataEndpoint.getAddress()))) {
                retriever.setExpandValueSets(true);
            }

            if (additionalData != null) {
                BundleRetrieveProvider bundleProvider = new BundleRetrieveProvider(resolver, additionalData, terminologyProvider);
                PriorityRetrieveProvider priorityProvider = new PriorityRetrieveProvider(bundleProvider, retriever);
                dataProvider = new CompositeDataProvider(resolver, priorityProvider);
            }
            else
            {
                dataProvider = new CompositeDataProvider(resolver, retriever);
            }

            
        } else {
            JpaFhirRetrieveProvider retriever = new JpaFhirRetrieveProvider(this.registry,
                    new SearchParameterResolver(resolver.getFhirContext()));
            retriever.setTerminologyProvider(terminologyProvider);
            // Assume it's a different server, therefore need to expand.
            if (terminologyEndpoint != null) {
                retriever.setExpandValueSets(true);
            }

            if (additionalData != null) {
                BundleRetrieveProvider bundleProvider = new BundleRetrieveProvider(resolver, additionalData, terminologyProvider);
                PriorityRetrieveProvider priorityProvider = new PriorityRetrieveProvider(bundleProvider, retriever);
                dataProvider = new CompositeDataProvider(resolver, priorityProvider);
            }
            else
            {
                dataProvider = new CompositeDataProvider(resolver, retriever);
            }
        }

        LibraryLoader libraryLoader = LibraryHelper.createLibraryLoader(this.getLibraryResourceProvider());

        CqlEngine engine = new CqlEngine(libraryLoader, Collections.singletonMap("http://hl7.org/fhir", dataProvider), terminologyProvider);

        Map<String, Object> resolvedParameters = new HashMap<>();

        if (parameters != null) {
            for (Parameters.ParametersParameterComponent pc : parameters.getParameter()) {
                resolvedParameters.put(pc.getName(), pc.getValue());
            }
        }

        if (periodStart != null && periodEnd != null) {
            // resolve the measurement period
            Interval measurementPeriod = new Interval(DateHelper.resolveRequestDate(periodStart, true), true,
                    DateHelper.resolveRequestDate(periodEnd, false), true);

            resolvedParameters.put("Measurement Period",
                    new Interval(DateTime.fromJavaDate((Date) measurementPeriod.getStart()), true,
                            DateTime.fromJavaDate((Date) measurementPeriod.getEnd()), true));
        }

        if (productLine != null) {
            resolvedParameters.put("Product Line", productLine);
        }

        EvaluationResult evalResult = engine.evaluate(libraryIdentifier,
                Pair.of(contextParam != null ? contextParam : "Unspecified", patientId == null ? "null" : patientId),
                resolvedParameters);

        List<Resource> results = new ArrayList<>();
        FhirMeasureBundler bundler = new FhirMeasureBundler();

        if (evalResult != null && evalResult.expressionResults != null) {
            for (Map.Entry<String, Object> def : evalResult.expressionResults.entrySet()) {

                Parameters result = new Parameters();

                try {
                    result.setId(def.getKey());
                    Object res = def.getValue();
                    // String location = String.format("[%d:%d]",
                    // locations.get(def.getName()).get(0),
                    // locations.get(def.getName()).get(1));
                    // result.addParameter().setName("location").setValue(new StringType(location));

                    // Object res = def instanceof org.cqframework.cql.elm.execution.FunctionDef
                    // ? "Definition successfully validated"
                    // : def.getExpression().evaluate(context);

                    if (res == null) {
                        result.addParameter().setName("value").setValue(new StringType("null"));
                    } else if (res instanceof List<?>) {
                        if (((List<?>) res).size() > 0 && ((List<?>) res).get(0) instanceof Resource) {
                            if (executionResults != null && executionResults.equals("Summary")) {
                                result.addParameter().setName("value")
                                        .setValue(new StringType(((Resource) ((List<?>) res).get(0)).getIdElement()
                                                .getResourceType() + "/"
                                                + ((Resource) ((List<?>) res).get(0)).getIdElement().getIdPart()));
                            } else {
                                result.addParameter().setName("value").setResource(bundler.bundle((Iterable) res));
                            }
                        } else {
                            result.addParameter().setName("value").setValue(new StringType(res.toString()));
                        }
                    } else if (res instanceof Iterable) {
                        result.addParameter().setName("value").setResource(bundler.bundle((Iterable) res));
                    } else if (res instanceof Resource) {
                        if (executionResults != null && executionResults.equals("Summary")) {
                            result.addParameter().setName("value")
                                    .setValue(new StringType(((Resource) res).getIdElement().getResourceType() + "/"
                                            + ((Resource) res).getIdElement().getIdPart()));
                        } else {
                            result.addParameter().setName("value").setResource((Resource) res);
                        }
                    } else {
                        result.addParameter().setName("value").setValue(new StringType(res.toString()));
                    }

                    result.addParameter().setName("resultType").setValue(new StringType(resolveType(res)));
                } catch (RuntimeException re) {
                    re.printStackTrace();

                    String message = re.getMessage() != null ? re.getMessage() : re.getClass().getName();
                    result.addParameter().setName("error").setValue(new StringType(message));
                }
                results.add(result);
            }
        }

        return bundler.bundle(results);
    }

    // TODO: Figure out if we should throw an exception or something here.
    @Override
    public void update(Library library) {
        this.libraryResourceProvider.getDao().update(library);
    }

    @Override
    public Library resolveLibraryById(String libraryId) {
        try {
            return this.libraryResourceProvider.getDao().read(new IdType(libraryId));
        } catch (Exception e) {
            throw new IllegalArgumentException(String.format("Could not resolve library id %s", libraryId));
        }
    }

    @Override
    public Library resolveLibraryByName(String libraryName, String libraryVersion) {
        Iterable<org.hl7.fhir.r4.model.Library> libraries = getLibrariesByName(libraryName);
        org.hl7.fhir.r4.model.Library library = LibraryResolutionProvider.selectFromList(libraries, libraryVersion,
                x -> x.getVersion());

        if (library == null) {
            throw new IllegalArgumentException(String.format("Could not resolve library name %s", libraryName));
        }

        return library;
    }

    @Override 
    public Library resolveLibraryByCanonicalUrl(String url) {
        Objects.requireNonNull(url, "url must not be null");

        String[] parts = url.split("\\|");
        String resourceUrl = parts[0];
        String version = null;
        if (parts.length > 1) {
            version = parts[1];
        }

        SearchParameterMap map = new SearchParameterMap();
        map.add("url", new UriParam(resourceUrl));
        if (version != null) {
            map.add("version", new TokenParam(version));
        }

        ca.uhn.fhir.rest.api.server.IBundleProvider bundleProvider = this.libraryResourceProvider.getDao().search(map);

        if (bundleProvider.size() == 0) {
            return null;
        }
        List<IBaseResource> resourceList = bundleProvider.getResources(0, bundleProvider.size());
        return  LibraryResolutionProvider.selectFromList(resolveLibraries(resourceList), version, x -> x.getVersion());
    }

    private Iterable<org.hl7.fhir.r4.model.Library> getLibrariesByName(String name) {
        // Search for libraries by name
        SearchParameterMap map = new SearchParameterMap();
        map.add("name", new StringParam(name, true));
        ca.uhn.fhir.rest.api.server.IBundleProvider bundleProvider = this.libraryResourceProvider.getDao().search(map);

        if (bundleProvider.size() == 0) {
            return new ArrayList<>();
        }
        List<IBaseResource> resourceList = bundleProvider.getResources(0, bundleProvider.size());
        return resolveLibraries(resourceList);
    }

    private Iterable<org.hl7.fhir.r4.model.Library> resolveLibraries(List<IBaseResource> resourceList) {
        List<org.hl7.fhir.r4.model.Library> ret = new ArrayList<>();
        for (IBaseResource res : resourceList) {
            Class<?> clazz = res.getClass();
            ret.add((org.hl7.fhir.r4.model.Library) clazz.cast(res));
        }
        return ret;
    }

    private Map<String, List<Integer>> getLocations(org.hl7.elm.r1.Library library) {
        Map<String, List<Integer>> locations = new HashMap<>();

        if (library.getStatements() == null)
            return locations;

        for (org.hl7.elm.r1.ExpressionDef def : library.getStatements().getDef()) {
            int startLine = def.getTrackbacks().isEmpty() ? 0 : def.getTrackbacks().get(0).getStartLine();
            int startChar = def.getTrackbacks().isEmpty() ? 0 : def.getTrackbacks().get(0).getStartChar();
            List<Integer> loc = Arrays.asList(startLine, startChar);
            locations.put(def.getName(), loc);
        }

        return locations;
    }

    private String resolveType(Object result) {
        String type = result == null ? "Null" : result.getClass().getSimpleName();
        switch (type) {
            case "BigDecimal":
                return "Decimal";
            case "ArrayList":
                return "List";
            case "FhirBundleCursor":
                return "Retrieve";
        }
        return type;
    }
}